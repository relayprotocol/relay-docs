import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ChainRoulette } from './components/ChainRoulette'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-relay-light">
            Chain Roulette
          </h1>
          <p className="text-sm text-gray-400">
            Cross-chain roulette powered by Relay
          </p>
        </div>
        <ConnectButton />
      </header>
      <main className="max-w-4xl mx-auto py-12 px-4">
        <ChainRoulette />
      </main>
    </div>
  )
}
