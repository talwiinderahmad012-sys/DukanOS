/**
 * sound-engine.ts — Complete Web Audio API sound engine for DukanOS
 *
 * Rules:
 *  - AudioContext is lazy-initialised on first user gesture (browser autoplay policy)
 *  - All sounds ≤ 300ms, max gain 0.12
 *  - Defaults to ON (localStorage 'dukaan_sounds_enabled' = 'true' on first visit)
 *  - Respects prefers-reduced-motion (if set, sounds are muted)
 *  - SSR-safe: all browser APIs guarded by typeof window checks
 */

const STORAGE_KEY = 'dukaan_sounds_enabled';
const MAX_GAIN = 0.12;

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Default ON
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }
  return stored === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled();
}

// ── Synthesis helpers ─────────────────────────────────────────────────────────

interface OscConfig {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number; // sweep to this frequency
  duration: number; // seconds
  gain?: number;
  attack?: number;
  decay?: number;
  startAt?: number; // seconds from now (for sequenced notes)
}

function osc(cfg: OscConfig): void {
  const ctx = getCtx();
  if (!ctx) return;

  const g = ctx.createGain();
  const o = ctx.createOscillator();

  const gain = Math.min(cfg.gain ?? 0.08, MAX_GAIN);
  const attack = cfg.attack ?? 0.005;
  const decay = cfg.decay ?? cfg.duration - attack;
  const now = ctx.currentTime + (cfg.startAt ?? 0);

  o.type = cfg.type ?? 'sine';
  o.frequency.setValueAtTime(cfg.freq, now);
  if (cfg.freqEnd !== undefined) {
    o.frequency.linearRampToValueAtTime(cfg.freqEnd, now + cfg.duration);
  }

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

  o.connect(g);
  g.connect(ctx.destination);
  o.start(now);
  o.stop(now + cfg.duration + 0.02);
}

/** White noise burst — for whoosh / filter sweep effects */
function noise(duration: number, gain: number, filterFreq: number, filterSweep?: number, startAt = 0): void {
  const ctx = getCtx();
  if (!ctx) return;

  const bufSize = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime + startAt);
  if (filterSweep !== undefined) {
    filter.frequency.linearRampToValueAtTime(filterSweep, ctx.currentTime + startAt + duration);
  }
  filter.Q.value = 0.8;

  const g = ctx.createGain();
  const now = ctx.currentTime + startAt;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(Math.min(gain, MAX_GAIN), now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(now);
  src.stop(now + duration + 0.02);
}

// ── Check gate ────────────────────────────────────────────────────────────────

function canPlay(): boolean {
  if (!isSoundEnabled()) return false;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

// ── Individual sounds ─────────────────────────────────────────────────────────

/** Nav link click — soft wooden tick (800Hz, 60ms) */
export function soundNavClick(): void {
  if (!canPlay()) return;
  osc({ type: 'triangle', freq: 800, duration: 0.06, gain: 0.07, attack: 0.002, decay: 0.055 });
}

/** Primary button (Save, Submit, POS Terminal) — satisfying pop (rising 400→800Hz) */
export function soundPrimaryButton(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 400, freqEnd: 800, duration: 0.12, gain: 0.10, attack: 0.004 });
}

/** Secondary button / toggle / switch — crisp click (1200Hz, 60ms) */
export function soundSecondaryButton(): void {
  if (!canPlay()) return;
  osc({ type: 'square', freq: 1200, duration: 0.06, gain: 0.05, attack: 0.002, decay: 0.055 });
}

/** Theme toggle — gentle whoosh (filtered noise sweep) */
export function soundThemeToggle(): void {
  if (!canPlay()) return;
  noise(0.20, 0.08, 400, 1800);
}

/** Language switch EN/UR — double tick */
export function soundLanguageSwitch(): void {
  if (!canPlay()) return;
  osc({ type: 'triangle', freq: 900, duration: 0.06, gain: 0.07, attack: 0.002 });
  osc({ type: 'triangle', freq: 1100, duration: 0.06, gain: 0.07, attack: 0.002, startAt: 0.08 });
}

/** Back button — reverse whoosh (noise sweep high→low) */
export function soundBackButton(): void {
  if (!canPlay()) return;
  noise(0.18, 0.07, 1600, 300);
}

/** Success / save — bright two-note chime (C5→E5, 523→659Hz) */
export function soundSuccess(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 523, duration: 0.14, gain: 0.09, attack: 0.005 });
  osc({ type: 'sine', freq: 659, duration: 0.14, gain: 0.09, attack: 0.005, startAt: 0.12 });
}

/** Error / validation fail — low soft thud (150Hz) */
export function soundError(): void {
  if (!canPlay()) return;
  osc({ type: 'triangle', freq: 150, freqEnd: 100, duration: 0.20, gain: 0.10, attack: 0.005 });
}

/** Sale completed — mini cash-register cha-ching (two quick highs + shimmer) */
export function soundSaleComplete(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 1047, duration: 0.08, gain: 0.11, attack: 0.003 });             // C6
  osc({ type: 'sine', freq: 1319, duration: 0.08, gain: 0.10, attack: 0.003, startAt: 0.09 }); // E6
  osc({ type: 'triangle', freq: 2093, freqEnd: 1200, duration: 0.20, gain: 0.06, attack: 0.002, startAt: 0.17 }); // shimmer
}

/** Notification received — iOS tri-tone */
export function soundNotification(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 988,  duration: 0.12, gain: 0.09, attack: 0.004 });            // B5
  osc({ type: 'sine', freq: 1319, duration: 0.10, gain: 0.09, attack: 0.004, startAt: 0.10 }); // E6
  osc({ type: 'sine', freq: 1047, duration: 0.14, gain: 0.09, attack: 0.004, startAt: 0.18 }); // C6
}

/** Hover on stat card — ultra-quiet tick (3% volume, optional) */
export function soundCardHover(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 1800, duration: 0.04, gain: 0.025, attack: 0.002, decay: 0.035 });
}

/** Toggle on */
export function soundToggleOn(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 900, freqEnd: 1100, duration: 0.08, gain: 0.07, attack: 0.003 });
}

/** Toggle off */
export function soundToggleOff(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 1100, freqEnd: 700, duration: 0.08, gain: 0.07, attack: 0.003 });
}

/** Warning */
export function soundWarning(): void {
  if (!canPlay()) return;
  osc({ type: 'sine', freq: 440, freqEnd: 380, duration: 0.18, gain: 0.08, attack: 0.004 });
}

// ── Data attribute sound map ──────────────────────────────────────────────────

const SOUND_MAP: Record<string, () => void> = {
  'nav-click': soundNavClick,
  'primary': soundPrimaryButton,
  'secondary': soundSecondaryButton,
  'theme': soundThemeToggle,
  'language': soundLanguageSwitch,
  'back': soundBackButton,
  'success': soundSuccess,
  'error': soundError,
  'sale-complete': soundSaleComplete,
  'notification': soundNotification,
  'toggle-on': soundToggleOn,
  'toggle-off': soundToggleOff,
};

/**
 * Global click handler — reads data-sound attribute from clicked element or
 * its ancestors and fires the corresponding sound.
 *
 * Usage in JSX: <button data-sound="primary">Save</button>
 * Or wrap in: useSoundHandler() hook which installs this on the document.
 */
export function handleGlobalClick(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const el = target.closest('[data-sound]') as HTMLElement | null;
  if (!el) return;
  const soundName = el.getAttribute('data-sound');
  if (!soundName) return;
  const fn = SOUND_MAP[soundName];
  if (fn) fn();
}

/**
 * Install the global click handler once (idempotent via marker attribute).
 * Call this from a client component useEffect.
 */
export function installGlobalSoundHandler(): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('click', handleGlobalClick, { passive: true });
  return () => document.removeEventListener('click', handleGlobalClick);
}
