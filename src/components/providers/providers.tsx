'use client';

import React from 'react';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/language-context';
import { IosBannerProvider } from '@/components/notifications/IosBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const { language } = useTranslation();
  const isUrdu = language === 'UR';

  return (
    <MotionConfig reducedMotion="user">
      <IosBannerProvider>
        {children}
        <Toaster
          position={isUrdu ? 'top-left' : 'top-right'}
          dir={isUrdu ? 'rtl' : 'ltr'}
          richColors
          closeButton
          toastOptions={{
            className: 'rounded-xl shadow-lg border text-sm font-medium',
            duration: 3500,
          }}
        />
      </IosBannerProvider>
    </MotionConfig>
  );
}
