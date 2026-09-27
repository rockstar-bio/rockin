type PluginListenerHandle = {
  remove: () => Promise<void>
}

type AppUrlOpenEvent = {
  url: string
}

type AppPlugin = {
  addListener?: (
    eventName: "appUrlOpen",
    listener: (event: AppUrlOpenEvent) => void
  ) => PluginListenerHandle | Promise<PluginListenerHandle>
}

type StatusBarStyle = "DARK" | "LIGHT" | "DEFAULT"

type StatusBarPlugin = {
  setBackgroundColor?: (options: { color: string }) => Promise<void>
  setStyle?: (options: { style: StatusBarStyle }) => Promise<void>
}

type BrowserPlugin = {
  open?: (options: { url: string }) => Promise<void>
}

type NativeSharePlugin = {
  share?: (options: {
    title?: string
    text?: string
    url?: string
    files?: string[]
    dialogTitle?: string
  }) => Promise<void>
}

type NativeThemePlugin = {
  setStyle?: (options: { style: "dark" | "light" | "system" }) => Promise<void>
}

type NativePaymentPlugin = {
  openUpiUrl?: (options: {
    url: string
    title?: string
  }) => Promise<{ opened: boolean }>
}

export type NativeSharedFile = {
  name: string
  type: string
  size: number
  data: string
}

type NativeImagePickerPlugin = {
  pickImages?: (options: {
    limit?: number
    title?: string
  }) => Promise<{ files: NativeSharedFile[] }>
}

export type NativeSharePayload = {
  id: string
  title?: string | null
  text?: string | null
  files: NativeSharedFile[]
}

type NativeShareTargetPlugin = {
  addListener?: (
    eventName: "shareReceived",
    listener: (event: NativeSharePayload) => void
  ) => PluginListenerHandle | Promise<PluginListenerHandle>
  getPendingShare?: () => Promise<{ share: NativeSharePayload | null }>
  clearPendingShare?: () => Promise<void>
}

type NativeAppSettingsPlugin = {
  openAppSettings?: () => Promise<void>
}

export type NativeUpdateState = {
  status: "downloading" | "downloaded" | "installing" | "installed" | "failed" | "canceled" | "unknown"
  bytesDownloaded: number
  totalBytesToDownload: number
}

export type NativeUpdateInfo = NativeUpdateState & {
  available: boolean
  inProgress: boolean
  availableVersionCode: number
  installStatus: NativeUpdateState["status"]
}

type NativeInAppUpdatePlugin = {
  checkForUpdate?: () => Promise<NativeUpdateInfo>
  startUpdate?: () => Promise<void>
  completeUpdate?: () => Promise<void>
  addListener?: (
    eventName: "updateStateChanged",
    listener: (state: NativeUpdateState) => void
  ) => PluginListenerHandle | Promise<PluginListenerHandle>
}

type NativeShareFilePlugin = {
  saveImage?: (options: {
    data: string
    fileName?: string
  }) => Promise<{ path?: string }>
}

type CameraPhoto = {
  format?: string
  path?: string
  webPath?: string
}

type CameraPlugin = {
  getPhoto?: (options: {
    allowEditing?: boolean
    quality?: number
    resultType: "uri"
    source?: "PROMPT" | "CAMERA" | "PHOTOS"
  }) => Promise<CameraPhoto>
  pickImages?: (options: {
    limit?: number
    quality?: number
  }) => Promise<{ photos: CameraPhoto[] }>
}

type CapacitorRuntime = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: {
    App?: AppPlugin
    Browser?: BrowserPlugin
    Camera?: CameraPlugin
    NativeAppSettings?: NativeAppSettingsPlugin
    NativeInAppUpdate?: NativeInAppUpdatePlugin
    NativeImagePicker?: NativeImagePickerPlugin
    NativeShareFile?: NativeShareFilePlugin
    NativePayment?: NativePaymentPlugin
    NativeTheme?: NativeThemePlugin
    NativeShareTarget?: NativeShareTargetPlugin
    Share?: NativeSharePlugin
    StatusBar?: StatusBarPlugin
  }
}

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime
  }
}

export function isNativeApp() {
  if (typeof window === "undefined") return false

  return window.Capacitor?.isNativePlatform?.() === true
}

export function getNativePlatform() {
  if (!isNativeApp()) return null

  return window.Capacitor?.getPlatform?.() ?? null
}

export function getNativeAppPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.App ?? null
}

export function getNativeStatusBarPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.StatusBar ?? null
}

export function getNativeBrowserPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.Browser ?? null
}

export function getNativeSharePlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.Share ?? null
}

export function getNativeCameraPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.Camera ?? null
}

export function getNativeImagePickerPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeImagePicker ?? null
}

export function getNativeShareFilePlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeShareFile ?? null
}

export function getNativeThemePlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeTheme ?? null
}

export function getNativePaymentPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativePayment ?? null
}

export function getNativeShareTargetPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeShareTarget ?? null
}

export function getNativeAppSettingsPlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeAppSettings ?? null
}

export function getNativeInAppUpdatePlugin() {
  if (!isNativeApp()) return null

  return window.Capacitor?.Plugins?.NativeInAppUpdate ?? null
}

/** Opens the OS App Info page. Returns false when unavailable (web or old shell). */
export async function openNativeAppSettings() {
  const settings = getNativeAppSettingsPlugin()

  if (!settings?.openAppSettings) return false

  try {
    await settings.openAppSettings()
    return true
  } catch {
    return false
  }
}

export async function openUpiPaymentUrl(
  url: string,
  options: {
    isNative?: boolean
    title?: string
  } = {}
) {
  if (typeof window === "undefined") return false

  if (options.isNative ?? isNativeApp()) {
    const payment = getNativePaymentPlugin()

    if (payment?.openUpiUrl) {
      const result = await payment.openUpiUrl({
        url,
        title: options.title,
      })

      return result.opened
    }
  }

  window.location.href = url
  return true
}

export async function openExternalUrl(
  url: string,
  options: {
    isNative?: boolean
    target?: string
    features?: string
  } = {}
) {
  if (typeof window === "undefined") return false

  if (options.isNative ?? isNativeApp()) {
    const browser = getNativeBrowserPlugin()

    if (browser?.open) {
      await browser.open({ url })
      return true
    }
  }

  const opened = window.open(
    url,
    options.target ?? "_blank",
    options.features ?? "noopener,noreferrer"
  )

  return opened != null
}

/**
 * Saves base64 image bytes into app-private storage and returns a file:// URL
 * that @capacitor/share can attach. Returns null outside the native app or
 * when the save fails, so callers can fall back to a text-only share.
 */
export async function saveNativeShareImage(
  dataUrl: string,
  options: {
    fileName?: string
    isNative?: boolean
  } = {}
) {
  if (!(options.isNative ?? isNativeApp())) return null

  const plugin = getNativeShareFilePlugin()

  if (!plugin?.saveImage) return null

  try {
    const result = await plugin.saveImage({
      data: dataUrl,
      fileName: options.fileName,
    })

    return result.path ?? null
  } catch {
    return null
  }
}

export async function shareNativeOrWeb(
  data: {
    title?: string
    text?: string
    url?: string
    files?: string[]
    dialogTitle?: string
  },
  options: {
    isNative?: boolean
  } = {}
) {
  if (typeof window === "undefined") return false

  if (options.isNative ?? isNativeApp()) {
    const share = getNativeSharePlugin()

    if (share?.share) {
      await share.share(data)
      return true
    }
  }

  // Web Share only accepts File objects, not file:// URL strings.
  const { files: _files, ...webData } = data

  if (typeof navigator.share === "function") {
    await navigator.share(webData)
    return true
  }

  return false
}

function isNativePickerCancel(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  return (
    message.includes("cancel") ||
    message.includes("dismiss") ||
    message.includes("no image") ||
    message.includes("user denied")
  )
}

function imageTypeFromFormat(format: string | undefined, fallback: string) {
  if (!format) return fallback

  const normalized = format.toLowerCase()

  if (normalized === "jpg") return "image/jpeg"
  if (normalized === "jpeg") return "image/jpeg"
  if (normalized === "png") return "image/png"
  if (normalized === "webp") return "image/webp"
  if (normalized === "heic") return "image/heic"
  if (normalized === "heif") return "image/heif"

  return fallback
}

function imageExtensionFromType(type: string) {
  if (type.includes("png")) return "png"
  if (type.includes("webp")) return "webp"
  if (type.includes("heic")) return "heic"
  if (type.includes("heif")) return "heif"

  return "jpg"
}

export function nativeSharedFileToFile(
  sharedFile: NativeSharedFile,
  fallbackName = "native-image.jpg"
) {
  const binary = atob(sharedFile.data)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], sharedFile.name || fallbackName, {
    type: sharedFile.type || "image/jpeg",
    lastModified: Date.now(),
  })
}

async function nativePhotoToFile(
  photo: CameraPhoto,
  index: number,
  prefix: string
) {
  const src = photo.webPath ?? photo.path

  if (!src) {
    throw new Error("Unable to read selected image.")
  }

  const response = await fetch(src)

  if (!response.ok) {
    throw new Error("Unable to read selected image.")
  }

  const blob = await response.blob()
  const type = blob.type || imageTypeFromFormat(photo.format, "image/jpeg")
  const extension = imageExtensionFromType(type)

  return new File([blob], `${prefix}-${Date.now()}-${index}.${extension}`, {
    type,
    lastModified: Date.now(),
  })
}

export async function pickNativeImageFiles({
  isNative,
  multiple = false,
  limit = multiple ? 10 : 1,
  quality = 85,
  prefix = "image",
}: {
  isNative?: boolean
  multiple?: boolean
  limit?: number
  quality?: number
  prefix?: string
}) {
  if (!(isNative ?? isNativeApp())) return null

  const camera = getNativeCameraPlugin()

  if (!camera) return null

  try {
    const photos =
      multiple && camera.pickImages
        ? (await camera.pickImages({ limit, quality })).photos
        : [
            await camera.getPhoto?.({
              allowEditing: false,
              quality,
              resultType: "uri",
              source: "PROMPT",
            }),
          ].filter((photo): photo is CameraPhoto => Boolean(photo))

    return Promise.all(
      photos
        .slice(0, limit)
        .map((photo, index) => nativePhotoToFile(photo, index, prefix))
    )
  } catch (error) {
    if (isNativePickerCancel(error)) return []
    throw error
  }
}

export async function pickNativeChooserImageFiles({
  isNative,
  limit = 1,
  title = "Select image",
}: {
  isNative?: boolean
  limit?: number
  title?: string
}) {
  if (!(isNative ?? isNativeApp())) return null

  const picker = getNativeImagePickerPlugin()

  if (!picker?.pickImages) return null

  try {
    const result = await picker.pickImages({
      limit,
      title,
    })

    return (result.files ?? [])
      .filter((file) => file.type?.startsWith("image/"))
      .slice(0, limit)
      .map((file) => nativeSharedFileToFile(file))
  } catch (error) {
    if (isNativePickerCancel(error)) return []
    throw error
  }
}
