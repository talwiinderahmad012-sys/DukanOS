/**
 * haptics.ts — Tactile feedback via navigator.vibrate
 *
 * Guards:
 *  - Only fires on devices that expose the Vibration API (Android Chrome).
 *  - iOS Safari silently ignores navigator.vibrate, so no special-casing needed.
 *  - SSR-safe: all calls are guarded by typeof navigator !== 'undefined'.
 *  - Reduced-motion: callers should check useReducedMotion() and skip if needed,
 *    but haptics are independent of visual motion so we don't auto-suppress here.
 */

type HapticPattern = number | number[];

/** Fire a vibration pattern safely. Does nothing on unsupported platforms. */
function vibrate(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined') return;
  if (!navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently swallow — some browsers throw on invalid patterns.
  }
}

/** Short confirmation tap (button press, toggle on). */
export function hapticLight(): void {
  vibrate(8);
}

/** Medium confirmation (save, select). */
export function hapticMedium(): void {
  vibrate(18);
}

/** Strong confirmation (success action). */
export function hapticHeavy(): void {
  vibrate(40);
}

/** Error shake pattern. */
export function hapticError(): void {
  vibrate([10, 60, 10, 60, 20]);
}

/** Warning notification pattern. */
export function hapticWarning(): void {
  vibrate([12, 40, 12]);
}

/** Success double-tap. */
export function hapticSuccess(): void {
  vibrate([10, 30, 20]);
}

/** Selection changed (picker, radio). */
export function hapticSelection(): void {
  vibrate(5);
}
