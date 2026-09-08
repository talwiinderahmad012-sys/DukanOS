'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getSoundsEnabled, setSoundsEnabled, soundToggleOn, soundToggleOff } from '@/lib/feedback/sounds';
import { hapticLight } from '@/lib/feedback/haptics';
import { cn } from '@/components/ui/cn';

/**
 * SoundsToggle — global UI sounds on/off control.
 *
 * Reads and writes the `dukaan_sounds_enabled` localStorage key.
 * Can be embedded in any settings panel or the dashboard header.
 */
export function SoundsToggle({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getSoundsEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundsEnabled(next);
    hapticLight();
    if (next) {
      soundToggleOn();
    } else {
      soundToggleOff();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'Mute UI sounds' : 'Enable UI sounds'}
      aria-label={enabled ? 'Mute UI sounds' : 'Enable UI sounds'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
