import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mainnet, base, arbitrum, optimism, zora } from 'wagmi/chains'
import {
  createClient,
  convertViemChainToRelayChain,
  MAINNET_RELAY_API,
} from '@relayprotocol/relay-sdk'

export const SUPPORTED_CHAINS = [base, arbitrum, optimism, mainnet, zora] as const

export const SETTLEMENT_CHAIN = base

export const CHAIN_COLORS: Record<number, string> = {
  [base.id]: '#0052FF',
  [arbitrum.id]: '#28A0F0',
  [optimism.id]: '#FF0420',
  [mainnet.id]: '#627EEA',
  [zora.id]: '#A1723A',
}

export const wagmiConfig = getDefaultConfig({
  appName: 'Chain Roulette',
  projectId: 'chain-roulette-demo',
  chains: [base, arbitrum, optimism, mainnet, zora],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [zora.id]: http(),
  },
})

createClient({
  baseApiUrl: MAINNET_RELAY_API,
  source: 'chain-roulette',
  chains: SUPPORTED_CHAINS.map((c) => convertViemChainToRelayChain(c)),
})
