import "./polyfills"
import { StrictMode, useCallback, useState } from "react"
import { createRoot } from "react-dom/client"
import "ethereum-identity-kit/css"

import "./index.css"
import App from "./App.tsx"
import { AppProviders } from "./providers/AppProviders"
import { SplashScreen } from "./components/SplashScreen"

function Root() {
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashReady = useCallback(() => {
    setShowSplash(false)
  }, [])

  return (
    <StrictMode>
      {showSplash && <SplashScreen onReady={handleSplashReady} />}
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  )
}

createRoot(document.getElementById("root")!).render(<Root />)
