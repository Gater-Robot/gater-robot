/**
 * Telegram Context Provider
 *
 * React context for Telegram Mini App SDK integration.
 * Provides user data, authentication state, and SDK utilities to child components.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  initTelegramSdk,
  getInitDataRaw,
  configureMainButton,
  configureBackButton,
  closeMiniApp,
  expandMiniApp,
  isInTelegramEnvironment,
  type TelegramUser,
  type TelegramInitResult,
} from '@/lib/telegram'

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
  params.set('user', JSON.stringify(telegramUserShape))
  params.set('auth_date', String(Math.floor(Date.now() / 1000)))
  // `hash` is normally required for cryptographic verification. This mock value
  // is only used in local development outside Telegram.
  params.set('hash', 'mock')
  return params.toString()
}

/**
 * Telegram context value interface
 */
interface TelegramContextValue {
  /** Whether SDK is initialized */
  isInitialized: boolean
  /** Whether running inside Telegram Mini App */
  isInTelegram: boolean
  /** Whether SDK is currently initializing */
  isLoading: boolean
  /** Initialization error if any */
  error: Error | null
  /** Current Telegram user */
  user: TelegramUser | null
  /** Raw init data for authentication */
  initDataRaw: string | null
  /** Theme parameters from Telegram */
  themeParams: TelegramInitResult['themeParams']
  /** Platform (ios, android, web, etc.) */
  platform: string | null
  /** Telegram Mini App version */
  version: string | null
  /** Start parameter from deep link */
  startParam?: string
  /** Configure the main button */
  setMainButton: typeof configureMainButton
  /** Configure the back button */
  setBackButton: typeof configureBackButton
  /** Close the mini app */
  close: typeof closeMiniApp
  /** Expand to full height */
  expand: typeof expandMiniApp
  /** Get fresh init data raw string */
  getInitData: () => string | null
}

const TelegramContext = createContext<TelegramContextValue | null>(null)

/**
 * Props for TelegramProvider
 */
interface TelegramProviderProps {
  children: ReactNode
  /** Mock user for development outside Telegram */
  mockUser?: TelegramUser
  /** Callback when initialization completes */
  onInitialized?: (result: TelegramInitResult) => void
}

/**
 * TelegramProvider - Wraps the app with Telegram SDK context
 *
 * @example
 * ```tsx
 * <TelegramProvider>
 *   <App />
 * </TelegramProvider>
 * ```
 *
 * In development, provide a mock user:
 * ```tsx
 * <TelegramProvider mockUser={{ id: '123', firstName: 'Test' }}>
 *   <App />
 * </TelegramProvider>
 * ```
 */
export function TelegramProvider({
  children,
  mockUser,
  onInitialized,
}: TelegramProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [initResult, setInitResult] = useState<TelegramInitResult | null>(null)

  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        setIsLoading(true)
        setError(null)

        const result = await initTelegramSdk()

        if (!mounted) return

        // If not in Telegram and we have a mock user, use it
        if (!result.isInTelegram && mockUser) {
          const mockInitDataRaw = buildMockInitDataRaw(mockUser)
          const mockResult: TelegramInitResult = {
            isInTelegram: false,
            user: mockUser,
            initDataRaw: mockInitDataRaw,
            themeParams: null,
            platform: 'web',
            version: 'mock',
          }
          setInitResult(mockResult)
          onInitialized?.(mockResult)
        } else {
          setInitResult(result)
          onInitialized?.(result)
        }

        setIsInitialized(true)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err : new Error('Failed to initialize Telegram SDK'))
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [mockUser, onInitialized])

  const getInitData = useCallback(() => {
    if (initResult?.initDataRaw) return initResult.initDataRaw
    if (mockUser && !isInTelegramEnvironment()) return buildMockInitDataRaw(mockUser)
    return getInitDataRaw()
  }, [initResult, mockUser])

  const value: TelegramContextValue = {
    isInitialized,
    isInTelegram: initResult?.isInTelegram ?? false,
    isLoading,
    error,
    user: initResult?.user ?? mockUser ?? null,
    initDataRaw: initResult?.initDataRaw ?? null,
    themeParams: initResult?.themeParams ?? null,
    platform: initResult?.platform ?? null,
    version: initResult?.version ?? null,
    startParam: initResult?.startParam,
    setMainButton: configureMainButton,
    setBackButton: configureBackButton,
    close: closeMiniApp,
    expand: expandMiniApp,
    getInitData,
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}

/**
 * Hook to access Telegram context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isInTelegram, initDataRaw } = useTelegram()
 *
 *   if (!user) return <div>Not authenticated</div>
 *
 *   return <div>Hello, {user.firstName}!</div>
 * }
 * ```
 */
export function useTelegram(): TelegramContextValue {
  const context = useContext(TelegramContext)

  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider')
  }

  return context
}

/**
 * Hook to get the authenticated user, throwing if not available
 *
 * @example
 * ```tsx
 * function AuthenticatedComponent() {
 *   const user = useTelegramUser() // Throws if no user
 *   return <div>Hello, {user.firstName}!</div>
 * }
 * ```
 */
export function useTelegramUser(): TelegramUser {
  const { user, isLoading } = useTelegram()

  if (isLoading) {
    throw new Error('Telegram SDK is still loading')
  }

  if (!user) {
    throw new Error('No Telegram user available')
  }

  return user
}

/**
 * Hook to get the init data raw string for Convex authentication
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const initDataRaw = useTelegramInitData()
 *
 *   const result = useQuery(api.users.getUserByTelegramId, {
 *     telegramUserId: '123',
 *     initDataRaw,
 *   })
 * }
 * ```
 */
export function useTelegramInitData(): string {
  const { getInitData, isLoading } = useTelegram()

  if (isLoading) {
    throw new Error('Telegram SDK is still loading')
  }

  const initData = getInitData()

  if (!initData) {
    throw new Error('No init data available')
  }

  return initData
}
