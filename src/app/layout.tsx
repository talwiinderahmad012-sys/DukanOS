import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n/constants";
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
  maximumScale: 1,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta name="robots" content="notranslate" />
        <script
          id="theme-language-init"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('dukaanos-ui-theme');
                if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
              try {
                var lang = localStorage.getItem('${LANGUAGE_STORAGE_KEY}');
                if (lang === 'UR') {
                  document.documentElement.lang = 'ur';
                  document.documentElement.dir = 'rtl';
                  document.documentElement.classList.add('lang-ur');
                } else {
                  document.documentElement.lang = 'en';
                  document.documentElement.dir = 'ltr';
                  document.documentElement.classList.remove('lang-ur');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoNastaliqUrdu.variable} antialiased min-h-screen bg-background text-foreground transition-colors`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <PWAProvider>
              {children}
            </PWAProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
