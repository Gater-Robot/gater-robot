import { Link, NavLink } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { appChain } from '../wagmi'
import { Button, Pill } from './ui'
import { formatAddress } from '../lib/format'

export function Navbar() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()

  return (
    <div className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="font-black tracking-tight">
          SUB Storefront
        </Link>

        <div className="ml-2 flex items-center gap-2 text-sm text-white/70">
          <NavLink to="/create" className={({isActive}) => isActive ? 'text-white' : ''}>Create</NavLink>
          <span className="text-white/20">/</span>
          <NavLink to="/manage" className={({isActive}) => isActive ? 'text-white' : ''}>Manage</NavLink>
          <span className="text-white/20">/</span>
          <NavLink to="/tokens" className={({isActive}) => isActive ? 'text-white' : ''}>Tokens</NavLink>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Pill>Chain: {appChain.name}</Pill>

          {isConnected && chainId !== appChain.id && (
            <Button
              variant="danger"
              onClick={() => switchChain({ chainId: appChain.id })}
              disabled={switching}
              title="Switch chain"
            >
              Switch chain
            </Button>
          )}

          {!isConnected ? (
            <Button
              variant="primary"
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
            >
              Connect wallet
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Pill title={address}>{formatAddress(address)}</Pill>
              <Button variant="ghost" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
