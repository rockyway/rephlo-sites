/**
 * Download Configuration
 *
 * Stores download URLs for each platform.
 * In production, these should be stored in environment variables or database.
 */

export const DOWNLOAD_URLS = {
  windows: process.env.DOWNLOAD_URL_WINDOWS || 'https://releases.rephlo.ai/rephlo-1.2.0-windows.exe',
  macos: process.env.DOWNLOAD_URL_MACOS || 'https://releases.rephlo.ai/rephlo-1.2.0-macos.dmg',
  linux: process.env.DOWNLOAD_URL_LINUX || 'https://releases.rephlo.ai/rephlo-1.2.0-linux.AppImage',
};

/**
 * Get download URL for a specific OS
 * @param os - Operating system (windows, macos, linux)
 * @returns Download URL
 */
export function getDownloadUrl(os: 'windows' | 'macos' | 'linux'): string {
  return DOWNLOAD_URLS[os];
}
