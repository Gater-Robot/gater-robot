/**
 * Telegram SDK Integration
 *
 * Utilities for the Telegram Mini App SDK.
 */

import {
  init,
  miniApp,
  backButton,
  mainButton,
  themeParams,
  viewport,
  retrieveLaunchParams,
  type User,
} from "@telegram-apps/sdk"

export interface TelegramUser {
  id: string
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
  isPremium?: boolean
  photoUrl?: string
}

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

export function isInTelegramEnvironment(): boolean {
  if (typeof window === "undefined") return false

  const webApp = (window as any).Telegram?.WebApp
  if (webApp?.initData) return true

  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has("tgWebAppData")) return true

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  if (hashParams.has("tgWebAppData")) return true

  return false
}

function extractUser(user: User | undefined): TelegramUser | null {
  if (!user) return null

  return {
    id: String(user.id),
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
    isPremium: user.is_premium,
    photoUrl: user.photo_url,
  }
}

export async function initTelegramSdk(): Promise<TelegramInitResult> {
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
    init()

    if (miniApp.mount.isAvailable()) miniApp.mount()
    if (backButton.mount.isAvailable()) backButton.mount()
    if (themeParams.mount.isAvailable()) themeParams.mount()
    if (viewport.mount.isAvailable()) viewport.mount()
    if (viewport.expand.isAvailable()) viewport.expand()

    const launchParams = retrieveLaunchParams()
    const user = extractUser(launchParams.tgWebAppData?.user)

    const rawData = launchParams.tgWebAppDataRaw
    const initDataRaw = typeof rawData === "string" ? rawData : null

    if (miniApp.ready.isAvailable()) miniApp.ready()

    return {
      isInTelegram: true,
      user,
      initDataRaw,
      themeParams: themeParams.isMounted()
        ? {
            bgColor: themeParams.backgroundColor(),
            textColor: themeParams.textColor(),
            buttonColor: themeParams.buttonColor(),
            buttonTextColor: themeParams.buttonTextColor(),
            secondaryBgColor: themeParams.secondaryBackgroundColor(),
          }
        : null,
      platform: launchParams.tgWebAppPlatform ?? null,
      version: launchParams.tgWebAppVersion ?? null,
      startParam: launchParams.tgWebAppStartParam,
    }
  } catch (error) {
    console.error("Failed to initialize Telegram SDK:", error)
    if (import.meta.env.DEV) {
      console.warn(
        "[gater] Telegram SDK init failed inside Telegram environment. " +
          "The real Telegram user will not be available. Check the error above.",
      )
    }
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

export function getInitDataRaw(): string | null {
  try {
    if (!isInTelegramEnvironment()) return null
    const launchParams = retrieveLaunchParams()
    const rawData = launchParams.tgWebAppDataRaw
    return typeof rawData === "string" ? rawData : null
  } catch {
    return null
  }
}

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

  if (config.text) mainButton.setParams({ text: config.text })
  if (config.color) {
    mainButton.setParams({ backgroundColor: config.color as `#${string}` })
  }
  if (config.textColor) {
    mainButton.setParams({ textColor: config.textColor as `#${string}` })
  }
  if (config.isVisible !== undefined) {
    mainButton.setParams({ isVisible: config.isVisible })
  }
  if (config.isEnabled !== undefined) {
    mainButton.setParams({ isEnabled: config.isEnabled })
  }
  if (config.onClick) {
    mainButton.onClick(config.onClick)
  }
}

export function configureBackButton(config: {
  isVisible?: boolean
  onClick?: () => void
}): VoidFunction | undefined {
  if (!backButton.mount.isAvailable()) return undefined
  backButton.mount()

  if (config.isVisible !== undefined) {
    if (config.isVisible) backButton.show()
    else backButton.hide()
  }

  if (config.onClick) {
    return backButton.onClick(config.onClick)
  }

  return undefined
}

export function closeMiniApp(): void {
  if (miniApp.close.isAvailable()) miniApp.close()
}

export function expandMiniApp(): void {
  if (viewport.expand.isAvailable()) viewport.expand()
}

