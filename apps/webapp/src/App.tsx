import { Suspense, lazy } from "react"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { RootLayout } from '@/layouts/RootLayout'
import { AdminPage } from '@/pages/AdminPage'
import { FaucetPage } from '@/pages/FaucetPage'
import { RouteLoading } from "@/components/RouteLoading"
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrgPage } from '@/pages/OrgPage'
import { OrgsPage } from '@/pages/OrgsPage'
import { UserPage } from '@/pages/UserPage'
import { EnsDemoPage } from '@/pages/EnsDemoPage'
import { HealthPage } from "@/pages/HealthPage"
import { RouteErrorPage } from "@/pages/RouteErrorPage"

const LazyGetEligiblePage = lazy(() =>
  import("@/pages/GetEligiblePage").then((m) => ({ default: m.GetEligiblePage })),
)

const LazyFluxApiTesterPage = lazy(() => import("@/pages/flux-api-tester"))

const appRoutes = [
  { index: true, element: <Navigate to="/user" replace /> },
  { path: 'user', element: <UserPage /> },
  { path: 'admin', element: <AdminPage /> },
  { path: 'orgs', element: <OrgsPage /> },
  { path: 'orgs/:orgId', element: <OrgPage /> },
  {
    path: "get-eligible",
    element: (
      <Suspense fallback={<RouteLoading />}>
        <LazyGetEligiblePage />
      </Suspense>
    ),
  },
  { path: 'faucet', element: <FaucetPage /> },
  { path: 'ens-eth-id', element: <EnsDemoPage /> },
  { path: "health", element: <HealthPage /> },
  {
    path: "flux-api-tester",
    element: (
      <Suspense fallback={<RouteLoading />}>
        <LazyFluxApiTesterPage />
      </Suspense>
    ),
  },

  { path: '*', element: <NotFoundPage /> },
]

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: appRoutes,
  },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App
