import type { Metadata } from 'next';
import { LimeDashboard } from '@/components/showcase/lime-dashboard';

export const metadata: Metadata = {
  title: 'Lime Design System | DukanOS',
  description:
    'Component library and dashboard reference built on the lime token set (light :root and dark .dark palettes).',
};

export default function ShowcasePage() {
  return <LimeDashboard />;
}
