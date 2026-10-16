/** Per-device conveniences (not secrets). Stored in localStorage; safe to lose. */
export interface DeviceSettings {
  autoLockMinutes: number;
  lockOnHide: boolean;
}

const KEY = "iranti:settings";
export const DEFAULT_SETTINGS: DeviceSettings = { autoLockMinutes: 5, lockOnHide: false };
export const AUTO_LOCK_CHOICES = [1, 5, 15, 30] as const;

export function loadSettings(): DeviceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DeviceSettings>;
    return {
      autoLockMinutes: AUTO_LOCK_CHOICES.includes(parsed.autoLockMinutes as 1)
        ? (parsed.autoLockMinutes as number)
        : DEFAULT_SETTINGS.autoLockMinutes,
      lockOnHide:
        typeof parsed.lockOnHide === "boolean" ? parsed.lockOnHide : DEFAULT_SETTINGS.lockOnHide,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: DeviceSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage blocked: settings fall back to defaults next time.
  }
}
