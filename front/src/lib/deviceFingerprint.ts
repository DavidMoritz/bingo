/**
 * Device Fingerprinting Utility
 * Generates a stable device identifier based on browser/device characteristics
 */

const STORAGE_KEY = 'moritz-device-id';

interface DeviceCharacteristics {
  userAgent: string;
  language: string;
  languages: readonly string[];
  platform: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  timezoneOffset: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
}

/**
 * Collects device characteristics for fingerprinting
 */
async function collectDeviceCharacteristics(): Promise<DeviceCharacteristics> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}x${screen.availWidth}x${screen.availHeight}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

/**
 * Generates a SHA-256 hash from device characteristics
 */
async function generateFingerprintHash(characteristics: DeviceCharacteristics): Promise<string> {
  const dataString = JSON.stringify(characteristics);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Gets or creates a device ID
 * - First checks localStorage for existing ID
 * - If not found, generates fingerprint hash
 * - Saves to localStorage for faster future lookups
 */
export async function getDeviceId(): Promise<string> {
  // Check localStorage first (acts as cache)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }

  // Generate from fingerprint
  const characteristics = await collectDeviceCharacteristics();
  const deviceId = await generateFingerprintHash(characteristics);

  // Cache in localStorage
  localStorage.setItem(STORAGE_KEY, deviceId);

  return deviceId;
}

/**
 * Clears the cached device ID (for testing purposes)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Gets device info for display purposes
 */
export async function getDeviceInfo(): Promise<{ deviceId: string; info: DeviceCharacteristics }> {
  const characteristics = await collectDeviceCharacteristics();
  const deviceId = await getDeviceId();
  return { deviceId, info: characteristics };
}
