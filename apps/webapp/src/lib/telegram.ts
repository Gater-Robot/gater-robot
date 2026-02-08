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
  isTMA,
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

type TelegramWebAppUserLike = {
  id?: string | number
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  username?: string
  language_code?: string
  languageCode?: string
  is_premium?: boolean
  isPremium?: boolean
  photo_url?: string
  photoUrl?: string
}

type TelegramWebAppGlobal = {
  initData?: string
  initDataUnsafe?: TelegramWebAppInitDataUnsafe
  platform?: string
  version?: string
}

type TelegramWebAppInitDataUnsafe = {
  user?: TelegramWebAppUserLike
  auth_date?: unknown
  authDate?: unknown
  hash?: unknown
  query_id?: unknown
  queryId?: unknown
  start_param?: unknown
  startParam?: unknown
  chat_type?: unknown
  chatType?: unknown
  chat_instance?: unknown
  chatInstance?: unknown
  receiver?: TelegramWebAppUserLike
  can_send_after?: unknown
  canSendAfter?: unknown
}

function getTelegramWebApp(): TelegramWebAppGlobal | null {
  if (typeof window === "undefined") return null
  const maybeTelegram = (window as { Telegram?: { WebApp?: TelegramWebAppGlobal } }).Telegram
  return maybeTelegram?.WebApp ?? null
}

function normalizeInitDataRaw(raw: unknown): string | null {
  return typeof raw === "string" && raw.length > 0 ? raw : null
}

function extractUserFromWebApp(user: TelegramWebAppUserLike | undefined): TelegramUser | null {
  if (!user?.id) return null

  return {
    id: String(user.id),
    firstName: user.first_name ?? user.firstName ?? "",
    lastName: user.last_name ?? user.lastName,
    username: user.username,
    languageCode: user.language_code ?? user.languageCode,
    isPremium: user.is_premium ?? user.isPremium,
    photoUrl: user.photo_url ?? user.photoUrl,
  }
}

function serializeUserForInitData(user: TelegramWebAppUserLike): Record<string, unknown> {
  const initDataUser: Record<string, unknown> = {
    id: Number.isFinite(Number(user.id)) ? Number(user.id) : String(user.id),
    first_name: user.first_name ?? user.firstName ?? "",
  }

  const lastName = user.last_name ?? user.lastName
  if (lastName) initDataUser.last_name = lastName
  if (user.username) initDataUser.username = user.username

  const languageCode = user.language_code ?? user.languageCode
  if (languageCode) initDataUser.language_code = languageCode

  const isPremium = user.is_premium ?? user.isPremium
  if (typeof isPremium === "boolean") initDataUser.is_premium = isPremium

  const photoUrl = user.photo_url ?? user.photoUrl
  if (photoUrl) initDataUser.photo_url = photoUrl

  return initDataUser
}

function normalizeAuthDate(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(Math.floor(raw))
  }
  if (raw instanceof Date) {
    return String(Math.floor(raw.getTime() / 1000))
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return trimmed
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) return String(Math.floor(parsed / 1000))
  }
  return null
}

function normalizeUnknownString(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildInitDataRawFromUnsafe(
  initDataUnsafe: TelegramWebAppInitDataUnsafe | undefined,
): string | null {
  if (!initDataUnsafe) return null

  const user =
    initDataUnsafe.user && typeof initDataUnsafe.user === "object"
      ? initDataUnsafe.user
      : undefined
  if (!user?.id) return null

  const authDate =
    normalizeAuthDate(initDataUnsafe.auth_date ?? initDataUnsafe.authDate) ??
    String(Math.floor(Date.now() / 1000))

  const params = new URLSearchParams()
  params.set("user", JSON.stringify(serializeUserForInitData(user)))
  params.set("auth_date", authDate)

  const hash = normalizeUnknownString(initDataUnsafe.hash)
  if (hash) params.set("hash", hash)

  const queryId = normalizeUnknownString(initDataUnsafe.query_id ?? initDataUnsafe.queryId)
  if (queryId) params.set("query_id", queryId)

  const startParam = normalizeUnknownString(
    initDataUnsafe.start_param ?? initDataUnsafe.startParam,
  )
  if (startParam) params.set("start_param", startParam)

  const chatType = normalizeUnknownString(initDataUnsafe.chat_type ?? initDataUnsafe.chatType)
  if (chatType) params.set("chat_type", chatType)

  const chatInstanceRaw = initDataUnsafe.chat_instance ?? initDataUnsafe.chatInstance
  if (chatInstanceRaw != null) {
    const chatInstance = String(chatInstanceRaw).trim()
    if (chatInstance) params.set("chat_instance", chatInstance)
  }

  const receiver =
    initDataUnsafe.receiver && typeof initDataUnsafe.receiver === "object"
      ? initDataUnsafe.receiver
      : undefined
  if (receiver?.id) {
    params.set("receiver", JSON.stringify(serializeUserForInitData(receiver)))
  }

  const canSendAfterRaw = initDataUnsafe.can_send_after ?? initDataUnsafe.canSendAfter
  if (typeof canSendAfterRaw === "number" && Number.isFinite(canSendAfterRaw)) {
    params.set("can_send_after", String(Math.floor(canSendAfterRaw)))
  } else if (
    typeof canSendAfterRaw === "string" &&
    canSendAfterRaw.trim().length > 0
  ) {
    params.set("can_send_after", canSendAfterRaw.trim())
  }

  return params.toString()
}

type LaunchParamsLike = {
  user?: TelegramWebAppUserLike
  initDataRaw: string | null
  platform: string | null
  version: string | null
  startParam?: string
}

function parseLaunchParams(raw: unknown): LaunchParamsLike {
  if (!raw || typeof raw !== "object") {
    return {
      initDataRaw: null,
      platform: null,
      version: null,
    }
  }

  const launch = raw as Record<string, unknown>
  const data = launch.tgWebAppData
  const dataRecord =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null
  const dataUser = dataRecord?.user
  const user =
    dataUser && typeof dataUser === "object"
      ? (dataUser as TelegramWebAppUserLike)
      : undefined

  return {
    user,
    initDataRaw: normalizeInitDataRaw(launch.tgWebAppDataRaw),
    platform:
      typeof launch.tgWebAppPlatform === "string"
        ? launch.tgWebAppPlatform
        : null,
    version:
      typeof launch.tgWebAppVersion === "string"
        ? launch.tgWebAppVersion
        : null,
    startParam:
      typeof launch.tgWebAppStartParam === "string"
        ? launch.tgWebAppStartParam
        : undefined,
  }
}

function getStartParamFromUnsafe(
  initDataUnsafe: TelegramWebAppInitDataUnsafe | undefined,
): string | undefined {
  const startParam = normalizeUnknownString(
    initDataUnsafe?.start_param ?? initDataUnsafe?.startParam,
  )
  return startParam ?? undefined
}

/**
 * Detects whether the app is running inside a Telegram Mini App.
 *
 * Delegates to the SDK's {@link isTMA} which checks the URL, the
 * Performance Navigation API, and sessionStorage — covering cases
 * the previous hand-rolled check missed (hash-based params, stripped
 * hashes, missing window.Telegram.WebApp).
 */
export function isInTelegramEnvironment(): boolean {
  try {
    if (isTMA()) return true
  } catch {
    // Fall back to checking the Telegram WebApp bridge object.
  }
  return getTelegramWebApp() != null
}

export async function initTelegramSdk(): Promise<TelegramInitResult> {
  const webApp = getTelegramWebApp()
  const isTelegram = isInTelegramEnvironment()

  if (!isTelegram) {
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

    let launchParams: LaunchParamsLike | null = null
    try {
      launchParams = parseLaunchParams(retrieveLaunchParams())
    } catch (launchParamsError) {
      if (import.meta.env.DEV) {
        console.warn("[gater] Failed to retrieve launch params from Telegram SDK:", launchParamsError)
      }
    }

    const user =
      extractUserFromWebApp(launchParams?.user) ??
      extractUserFromWebApp(webApp?.initDataUnsafe?.user)

    const sdkRaw = normalizeInitDataRaw(launchParams?.initDataRaw)
    const webAppInit = normalizeInitDataRaw(webApp?.initData)
    const reconstructed = buildInitDataRawFromUnsafe(webApp?.initDataUnsafe)
    const initDataRaw = sdkRaw ?? webAppInit ?? reconstructed

    const diagSource: InitDataRawSource = sdkRaw
      ? "sdk"
      : webAppInit
        ? "webAppInitData"
        : reconstructed
          ? "reconstructed"
          : "none"
    captureDiagnostics(sdkRaw, webAppInit, webApp?.initDataUnsafe, diagSource)

    if (miniApp.ready.isAvailable()) miniApp.ready()

    return {
      isInTelegram: isTelegram,
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
      platform: launchParams?.platform ?? webApp?.platform ?? null,
      version: launchParams?.version ?? webApp?.version ?? null,
      startParam: launchParams?.startParam ?? getStartParamFromUnsafe(webApp?.initDataUnsafe),
    }
  } catch (error) {
    console.error("Failed to initialize Telegram SDK:", error)
    if (import.meta.env.DEV) {
      console.warn(
        "[gater] Telegram SDK init failed inside Telegram environment. " +
          "The real Telegram user will not be available. Check the error above.",
      )
    }

    const fallbackUser = extractUserFromWebApp(webApp?.initDataUnsafe?.user)
    const fallbackWebAppInit = normalizeInitDataRaw(webApp?.initData)
    const fallbackReconstructed = buildInitDataRawFromUnsafe(webApp?.initDataUnsafe)
    const fallbackInitData = fallbackWebAppInit ?? fallbackReconstructed

    const fallbackSource: InitDataRawSource = fallbackWebAppInit
      ? "webAppInitData"
      : fallbackReconstructed
        ? "reconstructed"
        : "none"
    captureDiagnostics(null, fallbackWebAppInit, webApp?.initDataUnsafe, fallbackSource)

    if (fallbackUser || fallbackInitData) {
      return {
        isInTelegram: true,
        user: fallbackUser,
        initDataRaw: fallbackInitData,
        themeParams: null,
        platform: webApp?.platform ?? null,
        version: webApp?.version ?? null,
        startParam: getStartParamFromUnsafe(webApp?.initDataUnsafe),
      }
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
    try {
      const launchParams = parseLaunchParams(retrieveLaunchParams())
      const fromLaunchParams = normalizeInitDataRaw(launchParams.initDataRaw)
      if (fromLaunchParams) return fromLaunchParams
    } catch {
      // Fall through to Telegram WebApp bridge fallback below.
    }

    const webApp = getTelegramWebApp()
    return (
      normalizeInitDataRaw(webApp?.initData) ??
      buildInitDataRawFromUnsafe(webApp?.initDataUnsafe)
    )
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

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export type InitDataRawSource = "sdk" | "webAppInitData" | "reconstructed" | "none"

export interface TelegramDiagnostics {
  source: InitDataRawSource
  sdkRaw: string | null
  webAppInitData: string | null
  initDataUnsafeKeys: string[]
  hadAuthDate: boolean
  reconstructed: boolean
  timestamp: number
}

let lastDiagnostics: TelegramDiagnostics | null = null

export function getLastDiagnostics(): TelegramDiagnostics | null {
  return lastDiagnostics
}

function captureDiagnostics(
  sdkRaw: string | null,
  webAppInitData: string | null,
  initDataUnsafe: TelegramWebAppInitDataUnsafe | undefined,
  source: InitDataRawSource,
): void {
  lastDiagnostics = {
    source,
    sdkRaw: sdkRaw ? `${sdkRaw.slice(0, 32)}...` : null,
    webAppInitData: webAppInitData ? `${webAppInitData.slice(0, 32)}...` : null,
    initDataUnsafeKeys: initDataUnsafe ? Object.keys(initDataUnsafe) : [],
    hadAuthDate: initDataUnsafe
      ? normalizeAuthDate(initDataUnsafe.auth_date ?? initDataUnsafe.authDate) != null
      : false,
    reconstructed: source === "reconstructed",
    timestamp: Date.now(),
  }
}
