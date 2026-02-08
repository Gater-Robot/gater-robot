/**
 * Telegram Context Provider
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  initTelegramSdk,
  getInitDataRaw,
  getLastDiagnostics,
  configureMainButton,
  configureBackButton,
  closeMiniApp,
  expandMiniApp,
  isInTelegramEnvironment,
  type TelegramUser,
  type TelegramInitResult,
  type TelegramDiagnostics,
} from "@/lib/telegram"

function buildMockInitDataRaw(user: TelegramUser): string {
  const telegramUserShape = {
    id: Number.isFinite(Number(user.id)) ? Number(user.id) : user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    language_code: user.languageCode,
    is_premium: user.isPremium,
  }

  const params = new URLSearchParams()
  params.set("user", JSON.stringify(telegramUserShape))
  params.set("auth_date", String(Math.floor(Date.now() / 1000)))
  params.set("hash", "mock")
  return params.toString()
}

type TelegramContextValue = {
  isInitialized: boolean
  isInTelegram: boolean
  isLoading: boolean
  error: Error | null
  user: TelegramUser | null
  initDataRaw: string | null
  themeParams: TelegramInitResult["themeParams"]
  platform: string | null
  version: string | null
  startParam?: string
  diagnostics: TelegramDiagnostics | null
  setMainButton: typeof configureMainButton
  setBackButton: typeof configureBackButton
  close: typeof closeMiniApp
  expand: typeof expandMiniApp
  getInitData: () => string | null
}

const TelegramContext = createContext<TelegramContextValue | null>(null)

type TelegramProviderProps = {
  children: ReactNode
  mockUser?: TelegramUser
  onInitialized?: (result: TelegramInitResult) => void
}

export function TelegramProvider({
  children,
  mockUser,
  onInitialized,
}: TelegramProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [initResult, setInitResult] = useState<TelegramInitResult | null>(null)
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnostics | null>(null)

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        setIsLoading(true)
        setError(null)

        const result = await initTelegramSdk()
        if (!mounted) return

        if (!result.isInTelegram && mockUser && !isInTelegramEnvironment()) {
          const mockInitDataRaw = buildMockInitDataRaw(mockUser)
          const mockResult: TelegramInitResult = {
            isInTelegram: false,
            user: mockUser,
            initDataRaw: mockInitDataRaw,
            themeParams: null,
            platform: "web",
            version: "mock",
          }
          setInitResult(mockResult)
          onInitialized?.(mockResult)
        } else {
          setInitResult(result)
          onInitialized?.(result)
        }

        const diag = getLastDiagnostics()
        setDiagnostics(diag)
        if (diag?.reconstructed) {
          console.warn(
            "[gater] initDataRaw was reconstructed from initDataUnsafe — " +
              "HMAC validation will fail for admin actions.",
            diag,
          )
        }

        setIsInitialized(true)
      } catch (err) {
        if (!mounted) return
        setError(
          err instanceof Error ? err : new Error("Failed to initialize Telegram SDK"),
        )
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void initialize()
    return () => {
      mounted = false
    }
  }, [mockUser, onInitialized])

  const getInitData = useCallback(() => {
    if (initResult?.initDataRaw) return initResult.initDataRaw
    if (mockUser && !isInTelegramEnvironment()) return buildMockInitDataRaw(mockUser)
    return getInitDataRaw()
  }, [initResult, mockUser])

  const resolvedInitDataRaw = getInitData()

  const value: TelegramContextValue = {
    isInitialized,
    isInTelegram: initResult?.isInTelegram ?? false,
    isLoading,
    error,
    user: initResult?.user ?? mockUser ?? null,
    initDataRaw: resolvedInitDataRaw,
    themeParams: initResult?.themeParams ?? null,
    platform: initResult?.platform ?? null,
    version: initResult?.version ?? null,
    startParam: initResult?.startParam,
    diagnostics,
    setMainButton: configureMainButton,
    setBackButton: configureBackButton,
    close: closeMiniApp,
    expand: expandMiniApp,
    getInitData,
  }

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  )
}

export function useTelegram(): TelegramContextValue {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error("useTelegram must be used within a TelegramProvider")
  }
  return context
}

export function useTelegramInitData(): string {
  const { getInitData, isLoading } = useTelegram()

  if (isLoading) throw new Error("Telegram SDK is still loading")
  const initData = getInitData()
  if (!initData) throw new Error("No init data available")
  return initData
}
