import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import HomePage from './pages/HomePage'
import CreateProductPage from './pages/CreateProductPage'
import ManageIndexPage from './pages/ManageIndexPage'
import ManageProductPage from './pages/ManageProductPage'
import StorefrontPage from './pages/StorefrontPage'
import TokenToolsPage from './pages/TokenToolsPage'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateProductPage />} />
          <Route path="/manage" element={<ManageIndexPage />} />
          <Route path="/manage/:poolId" element={<ManageProductPage />} />
          <Route path="/product/:poolId" element={<StorefrontPage />} />
          <Route path="/tokens" element={<TokenToolsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
