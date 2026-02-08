import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import HomePage from './pages/HomePage'
import CreateProductPage from './pages/CreateProductPage'
import ManageIndexPage from './pages/ManageIndexPage'
import ManageProductPage from './pages/ManageProductPage'
import StorefrontPage from './pages/StorefrontPage'
import TokenToolsPage from './pages/TokenToolsPage'
import { contractsConfigIssue } from './lib/contracts'

export default function App() {
  if (contractsConfigIssue) {
    return (
      <div className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-black">Missing contract configuration</h1>
          <p className="mt-2 text-sm text-red-100">
            The app could not resolve required addresses from `VITE_*` env or `@gater/contracts` deployments.
          </p>
          <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/20 bg-black/30 p-4 text-xs text-red-50">
            {contractsConfigIssue}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateProductPage />} />
          <Route path="/manage" element={<ManageProductPage />} />
          <Route path="/manage/:poolId" element={<ManageProductPage />} />
          <Route path="/manage/index" element={<ManageIndexPage />} />
          <Route path="/product" element={<StorefrontPage />} />
          <Route path="/product/:poolId" element={<StorefrontPage />} />
          <Route path="/tokens" element={<TokenToolsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
