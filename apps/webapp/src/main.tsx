import "./polyfills"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "./components/theme-provider"
import { queryClient } from "./providers/queryClient"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
