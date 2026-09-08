'use client';

import React from 'react';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/language-context';
import { IosBannerProvider } from '@/components/notifications/IosBanner';
import { GlobalSoundHandler } from '@/components/ui/GlobalSoundHandler';

export function Providers({ children }: { children: React.ReactNode }) {
  const { language } = useTranslation();
  const isUrdu = language === 'UR';

  return (
    <MotionConfig reducedMotion="user">
      <IosBannerProvider>
        <GlobalSoundHandler />
        {children}
        <Toaster
          position={isUrdu ? 'top-left' : 'top-right'}
          dir={isUrdu ? 'rtl' : 'ltr'}
          richColors
          closeButton
          toastOptions={{
            className: 'glass-strong rounded-2xl shadow-xl border text-sm font-medium',
            duration: 3500,
          }}
        />
      </IosBannerProvider>
    </MotionConfig>
  );
}
