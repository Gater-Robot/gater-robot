import {
  SUBSCRIPTION_ADDRESSES,
  SUBSCRIPTION_FACTORY_ABI,
  SUBSCRIPTION_HOOK_ABI,
  SUBSCRIPTION_ROUTER_ABI,
} from '@gater/contracts'
import { getAddress, isAddress, type Address } from 'viem'

export { SUBSCRIPTION_FACTORY_ABI, SUBSCRIPTION_HOOK_ABI, SUBSCRIPTION_ROUTER_ABI }

export const SUB_DECIMALS = 18
export const USDC_DECIMALS = 6
export const DEFAULT_DEADLINE_SECONDS = 600
export const DEFAULT_BUY_SLIPPAGE_BPS = 200
export const DEFAULT_REFUND_SLIPPAGE_BPS = 200

type NetworkKey = 'base' | 'baseSepolia' | 'arcTestnet'
type AddressKey = 'factory' | 'router' | 'hook' | 'usdc' | 'subToken'
type AddressSource = 'env' | 'deployments'

type DeploymentRecord = {
  chainId?: number
  factory?: string
  router?: string
  usdc?: string
  sampleToken?: string
  sampleHook?: string
}

type ResolvedAddress = {
  value: Address | null
  source: AddressSource | null
  envKey: string
  deploymentKey: keyof DeploymentRecord
}

export type ContractsConfig = {
  chainId: number
  networkKey: NetworkKey
  factory: Address
  router: Address
  hook: Address
  usdc: Address
  subToken: Address
  sources: Record<AddressKey, AddressSource>
}

const CHAIN_TO_NETWORK: Record<number, NetworkKey> = {
  8453: 'base',
  84532: 'baseSepolia',
  5042002: 'arcTestnet',
}

const env = import.meta.env as Record<string, string | undefined>
const chainId = Number(env.VITE_CHAIN_ID || 8453)
const networkKey = CHAIN_TO_NETWORK[chainId]
const deployments = SUBSCRIPTION_ADDRESSES as Record<string, DeploymentRecord | undefined>
const fallback = networkKey ? deployments[networkKey] : undefined

const issues: string[] = []

if (!networkKey) {
  issues.push(
    `Unsupported VITE_CHAIN_ID=${chainId}. Supported chain IDs: 8453 (Base), 84532 (Base Sepolia), 5042002 (Arc Testnet).`
  )
}

function normalizeAddress(v?: string): Address | null {
  if (!v) return null
  if (!isAddress(v)) return null
  return getAddress(v)
}

function resolveAddress(envKey: string, deploymentKey: keyof DeploymentRecord): ResolvedAddress {
  const envRaw = env[envKey]
  const envAddr = normalizeAddress(envRaw)
  if (envRaw && !envAddr) {
    issues.push(`${envKey} is set but invalid: ${envRaw}`)
  }
  if (envAddr) {
    return { value: envAddr, source: 'env', envKey, deploymentKey }
  }

  const fallbackRaw = fallback?.[deploymentKey]
  const fallbackAddr = normalizeAddress(fallbackRaw)
  if (fallbackAddr) {
    return { value: fallbackAddr, source: 'deployments', envKey, deploymentKey }
  }

  issues.push(
    `Missing ${envKey}. No valid fallback found in @gater/contracts SUBSCRIPTION_ADDRESSES.${networkKey}.${deploymentKey}.`
  )
  return { value: null, source: null, envKey, deploymentKey }
}

const resolved = {
  factory: resolveAddress('VITE_FACTORY_ADDRESS', 'factory'),
  router: resolveAddress('VITE_ROUTER_ADDRESS', 'router'),
  hook: resolveAddress('VITE_HOOK_ADDRESS', 'sampleHook'),
  usdc: resolveAddress('VITE_USDC_ADDRESS', 'usdc'),
  subToken: resolveAddress('VITE_SUB_TOKEN_ADDRESS', 'sampleToken'),
}

export const contractsConfigIssue = issues.length > 0 ? issues.join('\n') : null

export const contractsConfig: ContractsConfig | null = contractsConfigIssue
  ? null
  : {
      chainId,
      networkKey: networkKey as NetworkKey,
      factory: resolved.factory.value as Address,
      router: resolved.router.value as Address,
      hook: resolved.hook.value as Address,
      usdc: resolved.usdc.value as Address,
      subToken: resolved.subToken.value as Address,
      sources: {
        factory: resolved.factory.source as AddressSource,
        router: resolved.router.source as AddressSource,
        hook: resolved.hook.source as AddressSource,
        usdc: resolved.usdc.source as AddressSource,
        subToken: resolved.subToken.source as AddressSource,
      },
    }

export function getContractsConfigSummary(): Array<{ label: string; address: string; source: string }> {
  return [
    { label: 'Factory', address: resolved.factory.value ?? 'missing', source: resolved.factory.source ?? 'missing' },
    { label: 'Router', address: resolved.router.value ?? 'missing', source: resolved.router.source ?? 'missing' },
    { label: 'Hook', address: resolved.hook.value ?? 'missing', source: resolved.hook.source ?? 'missing' },
    { label: 'USDC', address: resolved.usdc.value ?? 'missing', source: resolved.usdc.source ?? 'missing' },
    {
      label: 'SUB token',
      address: resolved.subToken.value ?? 'missing',
      source: resolved.subToken.source ?? 'missing',
    },
  ]
}
