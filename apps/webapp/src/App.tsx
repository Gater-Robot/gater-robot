import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AdminPage } from '@/pages/AdminPage'
import { FaucetPage } from '@/pages/FaucetPage'
import { GetEligiblePage } from '@/pages/GetEligiblePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrgPage } from '@/pages/OrgPage'
import { OrgsPage } from '@/pages/OrgsPage'
import { UserPage } from '@/pages/UserPage'
import { EnsDemoPage } from '@/pages/EnsDemoPage'

const appRoutes = [
  { index: true, element: <Navigate to="/user" replace /> },
  { path: 'user', element: <UserPage /> },
  { path: 'admin', element: <AdminPage /> },
  { path: 'orgs', element: <OrgsPage /> },
  { path: 'orgs/:orgId', element: <OrgPage /> },
  { path: 'get-eligible', element: <GetEligiblePage /> },
  { path: 'faucet', element: <FaucetPage /> },
  { path: 'ens-eth-id', element: <EnsDemoPage /> },

  { path: '*', element: <NotFoundPage /> },
]

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: appRoutes,
  },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App
