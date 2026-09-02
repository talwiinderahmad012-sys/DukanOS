import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { LANGUAGE_COOKIE_KEY } from "@/lib/i18n/constants";
import { ThemeProvider } from "@/components/theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq-urdu",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#aff33e",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom must remain available for accessibility (WCAG 1.4.4):
  // no maximumScale / user-scalable restrictions.
};

export const metadata: Metadata = {
  title: "DukaanOS | Retail POS & Business Intelligence",
  description: "Modern offline-aware POS and business intelligence platform for local retail businesses.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DukaanOS",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side locale detection via cookie mirror so Urdu users receive
  // RTL/Urdu markup on the first response (no English flash).
  const cookieStore = await cookies();
  const isUrdu = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value === 'UR';

  return (
    <html
      lang={isUrdu ? 'ur' : 'en'}
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={isUrdu ? 'notranslate lang-ur' : 'notranslate'}
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        <meta name="robots" content="notranslate" />
        {isUrdu && (
          <link
            rel="preload"
            href="/fonts/JameelNooriNastaleeqRegular.woff"
            as="font"
            type="font/woff"
            crossOrigin="anonymous"
          />
        )}
      </head>
      {/*
       * `min-h-[100dvh]` (not `min-h-screen` / 100vh): dashboard routes size
       * their shell to 100dvh. On mobile, 100vh is the LARGE viewport height
       * (URL bar hidden) while 100dvh is the visible one, so a 100vh floor here
       * would make the document a few dozen pixels taller than the viewport and
       * reintroduce a document scroll that drags the whole sticky shell around.
       */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoNastaliqUrdu.variable} antialiased min-h-[100dvh] bg-background text-foreground transition-colors`}
      >
        <ThemeProvider>
          <LanguageProvider initialLanguage={isUrdu ? 'UR' : 'EN'}>
            <PWAProvider>
              {children}
            </PWAProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
