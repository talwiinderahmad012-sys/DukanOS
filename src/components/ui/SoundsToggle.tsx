'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getSoundEnabled, setSoundEnabled } from '@/lib/feedback/sound-engine';
import { hapticLight } from '@/lib/feedback/haptics';
import { cn } from '@/components/ui/cn';

/**
 * SoundsToggle — global UI sounds on/off control.
 * Defaults to ON (sound-engine defaults ON on first visit).
 */
export function SoundsToggle({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(true); // optimistic: default on

  useEffect(() => {
    setEnabled(getSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    hapticLight();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'Mute UI sounds' : 'Enable UI sounds'}
      aria-label={enabled ? 'Mute UI sounds' : 'Enable UI sounds'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        'text-gray-500 hover:bg-white/50 hover:text-gray-700',
        'dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      data-sound="secondary"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
