import { Link, Outlet, useLocation } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  devOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/user', label: 'User' },
  { to: '/get-eligible', label: 'Get Eligible' },
  { to: '/faucet', label: 'Faucet' },
  { to: '/orgs', label: 'Orgs' },
  { to: '/admin', label: 'Admin' },
  { to: '/ens-eth-id', label: 'ENS Demo', devOnly: true },
]

export function RootLayout() {
  const location = useLocation()

  const navItems = NAV_ITEMS.filter((item) => !item.devOnly || import.meta.env.DEV)

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">
              G
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Gater Robot</div>
              <div className="text-xs text-zinc-500">webapp migration</div>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'rounded-md px-2 py-1 transition-colors',
                    isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

