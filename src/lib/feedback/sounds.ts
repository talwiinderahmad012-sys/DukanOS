/**
 * sounds.ts — Subtle UI sound effects via Web Audio API
 *
 * Constraints:
 *  - All sounds must be ≤ 250 ms duration.
 *  - Master gain is 0.05–0.08 to stay quiet and unobtrusive.
 *  - SSR-safe: AudioContext is only created in the browser.
 *  - User setting: reads localStorage key "dukaan_sounds_enabled" (default: false).
 *    The global settings panel toggles this flag.
 *  - Reduced-motion: respects prefers-reduced-motion by default (sounds are
 *    independent but we follow the user's wish to minimise system stimulation).
 */

const STORAGE_KEY = 'dukaan_sounds_enabled';
const MASTER_GAIN = 0.07;

let _ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (autoplay policy)
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/** Toggle sounds on/off and persist the preference. */
export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export function getSoundsEnabled(): boolean {
  return isSoundEnabled();
}

interface ToneOptions {
  frequency: number;
  duration: number;  // seconds
  type?: OscillatorType;
  /** Gain envelope: [attack, sustain, release] in seconds */
  envelope?: [number, number, number];
  gain?: number;
}

function playTone({ frequency, duration, type = 'sine', envelope = [0.005, 0.05, 0.08], gain = MASTER_GAIN }: ToneOptions): void {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  const [attack, sustain, release] = envelope;
  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + attack);
  gainNode.gain.setValueAtTime(gain, now + attack + sustain);
  gainNode.gain.linearRampToValueAtTime(0, now + attack + sustain + release);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

/** Soft click — button press */
export function soundClick(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 1200, duration: 0.06, type: 'sine', envelope: [0.002, 0.02, 0.04], gain: 0.05 });
}

/** Positive confirmation — success / save */
export function soundSuccess(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 880, duration: 0.12, type: 'sine', envelope: [0.004, 0.06, 0.06], gain: 0.07 });
  setTimeout(() => playTone({ frequency: 1100, duration: 0.10, type: 'sine', envelope: [0.004, 0.05, 0.05], gain: 0.06 }), 90);
}

/** Error notification */
export function soundError(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 300, duration: 0.18, type: 'triangle', envelope: [0.005, 0.08, 0.10], gain: 0.06 });
  setTimeout(() => playTone({ frequency: 260, duration: 0.14, type: 'triangle', envelope: [0.005, 0.07, 0.08], gain: 0.05 }), 140);
}

/** Warning notification */
export function soundWarning(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 600, duration: 0.14, type: 'sine', envelope: [0.004, 0.06, 0.08], gain: 0.06 });
}

/** Toast / banner arrival */
export function soundNotification(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 1047, duration: 0.10, type: 'sine', envelope: [0.003, 0.05, 0.05], gain: 0.06 });
  setTimeout(() => playTone({ frequency: 1319, duration: 0.10, type: 'sine', envelope: [0.003, 0.04, 0.05], gain: 0.05 }), 80);
}

/** Navigation / page transition */
export function soundNavigate(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 700, duration: 0.08, type: 'sine', envelope: [0.003, 0.03, 0.05], gain: 0.04 });
}

/** Toggle on */
export function soundToggleOn(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 1000, duration: 0.07, type: 'sine', envelope: [0.002, 0.03, 0.04], gain: 0.05 });
}

/** Toggle off */
export function soundToggleOff(): void {
  if (!isSoundEnabled()) return;
  playTone({ frequency: 800, duration: 0.07, type: 'sine', envelope: [0.002, 0.03, 0.04], gain: 0.05 });
}
