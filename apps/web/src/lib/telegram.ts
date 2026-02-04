/**
 * Telegram SDK Integration
 *
 * Provides utilities for interacting with the Telegram Mini App SDK.
 * Handles initialization, user data extraction, and platform detection.
 */

import {
  init,
  miniApp,
  initData,
  backButton,
  mainButton,
  themeParams,
  retrieveLaunchParams,
  type User,
} from '@telegram-apps/sdk'

/**
 * Telegram user data extracted from initData
 */
export interface TelegramUser {
  id: string
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
  isPremium?: boolean
  photoUrl?: string
}

/**
 * Result of Telegram SDK initialization
 */
export interface TelegramInitResult {
  isInTelegram: boolean
  user: TelegramUser | null
  initDataRaw: string | null
  themeParams: {
    bgColor?: string
    textColor?: string
    buttonColor?: string
    buttonTextColor?: string
    secondaryBgColor?: string
  } | null
  platform: string | null
  version: string | null
  startParam?: string
}

/**
 * Check if running inside Telegram Mini App environment
 */
export function isInTelegramEnvironment(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Telegram WebApp object
  const webApp = (window as any).Telegram?.WebApp
  if (webApp?.initData) return true

  // Check URL params for tgWebAppData
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('tgWebAppData')) return true

  // Check hash fragment for tgWebAppData
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  if (hashParams.has('tgWebAppData')) return true

  return false
}

/**
 * Extract user data from Telegram SDK User object
 */
function extractUser(user: User | undefined): TelegramUser | null {
  if (!user) return null

  return {
    id: String(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    languageCode: user.languageCode,
    isPremium: user.isPremium,
    photoUrl: user.photoUrl,
  }
}

/**
 * Initialize the Telegram Mini App SDK
 *
 * Call this early in app initialization (e.g., in main.tsx or a top-level provider)
 * Returns initialization result with user data and platform info.
 */
export async function initTelegramSdk(): Promise<TelegramInitResult> {
  // Not in Telegram environment
  if (!isInTelegramEnvironment()) {
    return {
      isInTelegram: false,
      user: null,
      initDataRaw: null,
      themeParams: null,
      platform: null,
      version: null,
    }
  }

  try {
    // Initialize the SDK
    init()

    // Mount components
    if (miniApp.mount.isAvailable()) {
      miniApp.mount()
    }

    if (backButton.mount.isAvailable()) {
      backButton.mount()
    }

    if (themeParams.mount.isAvailable()) {
      themeParams.mount()
    }

    // Get launch parameters
    const launchParams = retrieveLaunchParams()

    // Extract user from init data
    const user = extractUser(launchParams.tgWebAppData?.user)

    // Get init data raw string (use original signed string, not reconstructed)
    const initDataRaw = launchParams.tgWebAppDataRaw ?? null

    // Signal to Telegram that app is ready
    if (miniApp.ready.isAvailable()) {
      miniApp.ready()
    }

    return {
      isInTelegram: true,
      user,
      initDataRaw,
      themeParams: themeParams.state
        ? {
            bgColor: themeParams.backgroundColor?.(),
            textColor: themeParams.textColor?.(),
            buttonColor: themeParams.buttonColor?.(),
            buttonTextColor: themeParams.buttonTextColor?.(),
            secondaryBgColor: themeParams.secondaryBackgroundColor?.(),
          }
        : null,
      platform: launchParams.tgWebAppPlatform ?? null,
      version: launchParams.tgWebAppVersion ?? null,
      startParam: launchParams.tgWebAppStartParam,
    }
  } catch (error) {
    console.error('Failed to initialize Telegram SDK:', error)
    return {
      isInTelegram: false,
      user: null,
      initDataRaw: null,
      themeParams: null,
      platform: null,
      version: null,
    }
  }
}

/**
 * Get the raw init data string for authentication
 * This is what you pass to Convex for validation
 */
export function getInitDataRaw(): string | null {
  try {
    if (!isInTelegramEnvironment()) return null

    const launchParams = retrieveLaunchParams()

    // Use original signed string for backend validation
    return launchParams.tgWebAppDataRaw ?? null
  } catch {
    return null
  }
}

/**
 * Configure the main button appearance and behavior
 */
export function configureMainButton(config: {
  text: string
  color?: string
  textColor?: string
  isVisible?: boolean
  isEnabled?: boolean
  onClick?: () => void
}): void {
  if (!mainButton.mount.isAvailable()) return

  mainButton.mount()

  if (config.text) {
    mainButton.setParams({ text: config.text })
  }

  if (config.color) {
    mainButton.setParams({ backgroundColor: config.color })
  }

  if (config.textColor) {
    mainButton.setParams({ textColor: config.textColor })
  }

  if (config.isVisible !== undefined) {
    if (config.isVisible) {
      mainButton.show()
    } else {
      mainButton.hide()
    }
  }

  if (config.isEnabled !== undefined) {
    if (config.isEnabled) {
      mainButton.enable()
    } else {
      mainButton.disable()
    }
  }

  if (config.onClick) {
    mainButton.onClick(config.onClick)
  }
}

/**
 * Configure the back button
 */
export function configureBackButton(config: {
  isVisible?: boolean
  onClick?: () => void
}): void {
  if (!backButton.mount.isAvailable()) return

  backButton.mount()

  if (config.isVisible !== undefined) {
    if (config.isVisible) {
      backButton.show()
    } else {
      backButton.hide()
    }
  }

  if (config.onClick) {
    backButton.onClick(config.onClick)
  }
}

/**
 * Close the Mini App
 */
export function closeMiniApp(): void {
  if (miniApp.close.isAvailable()) {
    miniApp.close()
  }
}

/**
 * Expand the Mini App to full height
 */
export function expandMiniApp(): void {
  if (miniApp.requestFullscreen.isAvailable()) {
    miniApp.requestFullscreen()
  }
}
