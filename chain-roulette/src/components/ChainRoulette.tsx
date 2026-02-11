import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { SUPPORTED_CHAINS, SETTLEMENT_CHAIN } from '../wagmi'
import {
  getDepositQuote,
  getPayoutQuote,
  executeSteps,
  pollStatus,
  type IntentStatus,
} from '../services/relay-service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GamePhase = 'entry' | 'spinning' | 'winner' | 'payout' | 'complete'

interface Player {
  address: string
  chainId: number
  chainName: string
  amount: string
  depositStatus: IntentStatus | 'quoting' | 'executing'
  requestId?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WHEEL_COLORS = ['#4615C8', '#A7AAFF', '#6B21A8', '#7C3AED', '#DDD6FE']

function getChainName(chainId: number): string {
  return (
    SUPPORTED_CHAINS.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`
  )
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function buildWheelGradient(players: Player[]): string {
  if (players.length === 0) return '#1f2937'
  const seg = 360 / players.length
  const stops = players.map((_, i) => {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
    return `${color} ${seg * i}deg ${seg * (i + 1)}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}

// ---------------------------------------------------------------------------
// Status tracker sub-component
// ---------------------------------------------------------------------------

const STATUS_STEPS: IntentStatus[] = ['waiting', 'pending', 'submitted', 'success']

function StatusTracker({ current }: { current: IntentStatus | null }) {
  const idx = current ? STATUS_STEPS.indexOf(current) : -1
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {STATUS_STEPS.map((s, i) => {
        const isActive = i <= idx
        const isCurrent = s === current
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`status-dot ${
                  isCurrent
                    ? 'status-dot-pending'
                    : isActive
                      ? 'status-dot-active'
                      : 'status-dot-inactive'
                }`}
              />
              <span className={isActive ? 'text-white' : 'text-gray-500'}>
                {s}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <span className={isActive ? 'text-gray-400' : 'text-gray-700'}>
                &rarr;
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChainRoulette() {
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  // Game state
  const [phase, setPhase] = useState<GamePhase>('entry')
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedChainId, setSelectedChainId] = useState<number>(
    SUPPORTED_CHAINS[0].id
  )
  const [depositAmount, setDepositAmount] = useState('0.001')
  const [winner, setWinner] = useState<Player | null>(null)
  const [payoutStatus, setPayoutStatus] = useState<IntentStatus | null>(null)
  const [spinDegrees, setSpinDegrees] = useState(0)
  const [isDepositing, setIsDepositing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- Player helpers ---

  const updatePlayer = useCallback(
    (addr: string, patch: Partial<Player>) =>
      setPlayers((prev) =>
        prev.map((p) => (p.address === addr ? { ...p, ...patch } : p))
      ),
    []
  )

  const removePlayer = useCallback(
    (addr: string) =>
      setPlayers((prev) => prev.filter((p) => p.address !== addr)),
    []
  )

  // --- Deposit flow ---

  async function handleDeposit() {
    if (!walletClient || !address) return
    setIsDepositing(true)
    setError(null)

    try {
      // Switch chain if needed
      if (chain?.id !== selectedChainId) {
        await switchChainAsync({ chainId: selectedChainId })
      }

      const amountWei = parseEther(depositAmount)

      // Add player optimistically
      const newPlayer: Player = {
        address,
        chainId: selectedChainId,
        chainName: getChainName(selectedChainId),
        amount: amountWei.toString(),
        depositStatus: 'quoting',
      }
      setPlayers((prev) => [...prev, newPlayer])

      // 1. Get quote
      const quote = await getDepositQuote({
        userAddress: address,
        originChainId: selectedChainId,
        amount: amountWei.toString(),
      })

      updatePlayer(address, { depositStatus: 'executing' })

      // 2. Execute steps
      const requestId = await executeSteps(
        quote.steps,
        walletClient,
        (_step, status) => updatePlayer(address, { depositStatus: status as Player['depositStatus'] })
      )

      // 3. Poll status
      if (requestId) {
        updatePlayer(address, { requestId, depositStatus: 'waiting' })
        const finalStatus = await pollStatus(requestId, (data) =>
          updatePlayer(address, { depositStatus: data.status })
        )

        if (finalStatus.status !== 'success') {
          removePlayer(address)
          setError('Deposit failed or was refunded.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
      removePlayer(address)
    } finally {
      setIsDepositing(false)
    }
  }

  // --- Spin ---

  function handleSpin() {
    if (players.length < 2) return
    setPhase('spinning')

    const winnerIndex = Math.floor(Math.random() * players.length)
    const segmentAngle = 360 / players.length
    // 5 full rotations + land in the middle of the winner's segment
    const targetDeg =
      360 * 5 + (360 - winnerIndex * segmentAngle - segmentAngle / 2)
    setSpinDegrees(targetDeg)

    setTimeout(() => {
      setWinner(players[winnerIndex])
      setPhase('winner')
    }, 4200)
  }

  // --- Payout ---

  async function handlePayout() {
    if (!walletClient || !address || !winner) return
    setPhase('payout')
    setError(null)

    try {
      // Calculate total prize
      const totalPrize = players.reduce(
        (sum, p) => sum + BigInt(p.amount),
        0n
      )

      // Switch to settlement chain for payout
      if (chain?.id !== SETTLEMENT_CHAIN.id) {
        await switchChainAsync({ chainId: SETTLEMENT_CHAIN.id })
      }

      const quote = await getPayoutQuote({
        operatorAddress: address,
        recipientAddress: winner.address,
        destinationChainId: winner.chainId,
        amount: totalPrize.toString(),
      })

      const requestId = await executeSteps(quote.steps, walletClient)

      if (requestId) {
        const finalStatus = await pollStatus(requestId, (data) =>
          setPayoutStatus(data.status)
        )

        if (finalStatus.status === 'success') {
          setPhase('complete')
        } else {
          setError('Payout failed. Please try again.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout failed')
    }
  }

  // --- Reset ---

  function handlePlayAgain() {
    setPhase('entry')
    setPlayers([])
    setWinner(null)
    setPayoutStatus(null)
    setSpinDegrees(0)
    setError(null)
  }

  // --- Computed ---

  const alreadyEntered = players.some((p) => p.address === address)
  const totalPot = players.reduce((sum, p) => sum + BigInt(p.amount), 0n)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
          {error}
          <button
            className="ml-3 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Roulette Wheel */}
      <div className="wheel-container">
        <div className="wheel-pointer" />
        <div
          className={`wheel ${phase === 'spinning' ? 'animate-spin-wheel' : ''}`}
          style={
            {
              background: buildWheelGradient(players),
              '--spin-degrees': `${spinDegrees}deg`,
              ...(phase !== 'spinning' && spinDegrees > 0
                ? { transform: `rotate(${spinDegrees}deg)` }
                : {}),
            } as React.CSSProperties
          }
        >
          {/* Segment labels */}
          {players.map((p, i) => {
            const seg = 360 / players.length
            const angle = seg * i + seg / 2 - 90
            return (
              <div
                key={p.address}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <span
                  className="text-[10px] font-bold text-white drop-shadow-md"
                  style={{
                    transform: `translateX(80px) rotate(${-angle}deg)`,
                  }}
                >
                  {truncateAddress(p.address)}
                </span>
              </div>
            )
          })}

          {/* Empty state */}
          {players.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-sm">No players yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Pot display */}
      {players.length > 0 && (
        <div className="text-center">
          <span className="text-gray-400 text-sm">Total Pot</span>
          <p className="text-2xl font-bold text-relay-light">
            {formatEther(totalPot)} ETH
          </p>
        </div>
      )}

      {/* Entry Form */}
      {phase === 'entry' && isConnected && !alreadyEntered && (
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Enter the Roulette</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Chain selector */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Deposit Chain
              </label>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {SUPPORTED_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className="w-full bg-relay-purple hover:bg-relay-purple/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
          >
            {isDepositing ? 'Depositing...' : 'Enter Roulette'}
          </button>
        </div>
      )}

      {/* Not connected prompt */}
      {phase === 'entry' && !isConnected && (
        <div className="bg-gray-900 rounded-xl p-6 text-center text-gray-400">
          Connect your wallet to enter the roulette.
        </div>
      )}

      {/* Player List */}
      {players.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Players ({players.length})
          </h2>
          <div className="space-y-3">
            {players.map((p) => (
              <div
                key={p.address}
                className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-relay-purple/30 flex items-center justify-center text-xs font-bold">
                    {p.chainName.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-mono text-sm">
                      {truncateAddress(p.address)}
                    </p>
                    <p className="text-xs text-gray-400">{p.chainName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatEther(BigInt(p.amount))} ETH
                  </p>
                  <p className="text-xs">
                    {p.depositStatus === 'success' ? (
                      <span className="text-green-400">Confirmed</span>
                    ) : p.depositStatus === 'failure' ||
                      p.depositStatus === 'refunded' ? (
                      <span className="text-red-400">
                        {p.depositStatus}
                      </span>
                    ) : (
                      <span className="text-yellow-400">
                        {p.depositStatus}...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spin Button */}
      {phase === 'entry' && players.length >= 2 && (
        <button
          onClick={handleSpin}
          className="w-full bg-gradient-to-r from-relay-purple to-purple-500 hover:from-relay-purple/80 hover:to-purple-400 rounded-lg py-4 text-xl font-bold transition-all shadow-lg shadow-relay-purple/30"
        >
          Spin the Wheel!
        </button>
      )}

      {/* Winner + Payout */}
      {phase === 'winner' && winner && (
        <div className="bg-gray-900 rounded-xl p-8 text-center space-y-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Winner</p>
            <p className="text-3xl font-bold text-relay-light">
              {truncateAddress(winner.address)}
            </p>
            <p className="text-gray-400 mt-1">on {winner.chainName}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-1">Prize</p>
            <p className="text-2xl font-bold">
              {formatEther(totalPot)} ETH
            </p>
          </div>

          <button
            onClick={handlePayout}
            className="bg-green-600 hover:bg-green-500 rounded-lg px-8 py-3 font-semibold transition-colors"
          >
            Pay Out Winner via Relay
          </button>
        </div>
      )}

      {/* Payout In Progress */}
      {phase === 'payout' && (
        <div className="bg-gray-900 rounded-xl p-8 text-center space-y-6">
          <p className="text-lg font-semibold">Paying out winner...</p>
          <p className="text-gray-400">
            Bridging {formatEther(totalPot)} ETH to{' '}
            {winner?.chainName} via Relay
          </p>
          <StatusTracker current={payoutStatus} />
        </div>
      )}

      {/* Complete */}
      {phase === 'complete' && winner && (
        <div className="bg-gray-900 rounded-xl p-8 text-center space-y-6">
          <p className="text-4xl">&#127881;</p>
          <div>
            <p className="text-2xl font-bold text-green-400">Payout Complete!</p>
            <p className="text-gray-400 mt-2">
              {formatEther(totalPot)} ETH sent to{' '}
              {truncateAddress(winner.address)} on {winner.chainName}
            </p>
          </div>
          <button
            onClick={handlePlayAgain}
            className="bg-relay-purple hover:bg-relay-purple/80 rounded-lg px-8 py-3 font-semibold transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
