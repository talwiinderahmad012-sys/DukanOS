'use client';

/**
 * GlobalSoundHandler — installs the data-sound global click handler
 * and exposes the sounds-enabled toggle.
 *
 * Mount once in Providers. Does nothing on SSR.
 */

import { useEffect } from 'react';
import { installGlobalSoundHandler } from '@/lib/feedback/sound-engine';

export function GlobalSoundHandler() {
  useEffect(() => {
    const cleanup = installGlobalSoundHandler();
    return cleanup;
  }, []);

  return null;
}
