import type { WalletClient } from 'viem'

const RELAY_API_BASE = 'https://api.relay.link'
const NATIVE_ETH = '0x0000000000000000000000000000000000000000'
const APP_FEE_RECIPIENT = import.meta.env.VITE_APP_FEE_RECIPIENT as string
const APP_FEE_BPS = '100' // 1% app fee

export type IntentStatus =
  | 'waiting'
  | 'pending'
  | 'submitted'
  | 'success'
  | 'delayed'
  | 'refunded'
  | 'failure'

export interface StatusResponse {
  status: IntentStatus
  inTxHashes?: string[]
  txHashes?: string[]
  originChainId?: number
  destinationChainId?: number
}

// ---------------------------------------------------------------------------
// Quote APIs
// ---------------------------------------------------------------------------

export async function getDepositQuote(params: {
  userAddress: string
  originChainId: number
  amount: string
}) {
  const body: Record<string, unknown> = {
    user: params.userAddress,
    originChainId: params.originChainId,
    destinationChainId: 8453, // Base — settlement chain
    originCurrency: NATIVE_ETH,
    destinationCurrency: NATIVE_ETH,
    amount: params.amount,
    tradeType: 'EXACT_INPUT',
  }

  if (APP_FEE_RECIPIENT) {
    body.appFees = [{ recipient: APP_FEE_RECIPIENT, fee: APP_FEE_BPS }]
  }

  const response = await fetch(`${RELAY_API_BASE}/quote/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as { message?: string }).message || 'Failed to get deposit quote'
    )
  }

  return response.json()
}

export async function getPayoutQuote(params: {
  operatorAddress: string
  recipientAddress: string
  destinationChainId: number
  amount: string
}) {
  const response = await fetch(`${RELAY_API_BASE}/quote/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: params.operatorAddress,
      recipient: params.recipientAddress,
      originChainId: 8453, // Base — settlement chain
      destinationChainId: params.destinationChainId,
      originCurrency: NATIVE_ETH,
      destinationCurrency: NATIVE_ETH,
      amount: params.amount,
      tradeType: 'EXACT_INPUT',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as { message?: string }).message || 'Failed to get payout quote'
    )
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Step Execution
// ---------------------------------------------------------------------------

interface StepItem {
  status: string
  data: {
    from?: string
    to?: string
    data?: string
    value?: string
    chainId?: number
    gas?: string | number
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
    sign?: {
      signatureKind: 'eip191' | 'eip712'
      message?: string
      domain?: Record<string, unknown>
      types?: Record<string, unknown>
      primaryType?: string
      value?: Record<string, unknown>
    }
    post?: {
      endpoint: string
      method: string
      body: Record<string, unknown>
    }
  }
  check?: {
    endpoint: string
    method: string
  }
}

interface Step {
  id: string
  kind: 'transaction' | 'signature'
  action: string
  description: string
  items: StepItem[]
  requestId?: string
}

export async function executeSteps(
  steps: Step[],
  walletClient: WalletClient,
  onStepProgress?: (step: Step, status: string) => void
): Promise<string | undefined> {
  let requestId: string | undefined

  for (const step of steps) {
    if (!step.items || step.items.length === 0) continue

    for (const item of step.items) {
      if (step.kind === 'transaction') {
        onStepProgress?.(step, 'submitting')

        const txParams: Record<string, unknown> = {
          to: item.data.to as `0x${string}`,
          data: item.data.data as `0x${string}`,
          value: BigInt(item.data.value || '0'),
          chainId: item.data.chainId,
        }

        if (item.data.gas) {
          txParams.gas = BigInt(item.data.gas)
        }

        await walletClient.sendTransaction(
          txParams as Parameters<WalletClient['sendTransaction']>[0]
        )

        onStepProgress?.(step, 'submitted')
        requestId = step.requestId
      } else if (step.kind === 'signature') {
        const signData = item.data.sign
        if (!signData) throw new Error('Missing sign data in signature step')

        let signature: string

        if (signData.signatureKind === 'eip191') {
          signature = await walletClient.signMessage({
            message: signData.message!,
            account: walletClient.account!,
          })
        } else if (signData.signatureKind === 'eip712') {
          signature = await walletClient.signTypedData({
            domain: signData.domain as Parameters<
              WalletClient['signTypedData']
            >[0]['domain'],
            types: signData.types as Parameters<
              WalletClient['signTypedData']
            >[0]['types'],
            primaryType: signData.primaryType!,
            message: signData.value as Record<string, unknown>,
            account: walletClient.account!,
          })
        } else {
          throw new Error(`Unknown signature kind: ${signData.signatureKind}`)
        }

        const postData = item.data.post
        if (postData) {
          const postEndpoint = postData.endpoint.startsWith('http')
            ? postData.endpoint
            : `${RELAY_API_BASE}${postData.endpoint}`

          await fetch(`${postEndpoint}?signature=${signature}`, {
            method: postData.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData.body),
          })
        }

        onStepProgress?.(step, 'signed')
        requestId =
          step.requestId ||
          (item.data.post?.body?.requestId as string | undefined)
      }
    }
  }

  return requestId
}

// ---------------------------------------------------------------------------
// Status Polling
// ---------------------------------------------------------------------------

export async function pollStatus(
  requestId: string,
  onStatusChange?: (status: StatusResponse) => void,
  intervalMs = 2000,
  maxAttempts = 60
): Promise<StatusResponse> {
  const terminalStatuses: IntentStatus[] = ['success', 'failure', 'refunded']

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${RELAY_API_BASE}/intents/status/v3?requestId=${requestId}`
    )
    const data: StatusResponse = await response.json()

    onStatusChange?.(data)

    if (terminalStatuses.includes(data.status)) {
      return data
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Status polling timed out')
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export async function getSupportedChains() {
  const response = await fetch(`${RELAY_API_BASE}/chains`)
  if (!response.ok) throw new Error('Failed to fetch chains')
  return response.json()
}

export { NATIVE_ETH, RELAY_API_BASE }
