import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Next.js 16: only the `position` key is valid on `devIndicators`. The
  // legacy Next 14 keys (appIsrStatus / buildActivity / buildActivityPosition)
  // were removed in v16 and would be ignored if present.
  devIndicators: {
    position: 'bottom-left',
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'" +
                (isProduction ? '' : " 'unsafe-eval'"),
              // Dev-only: the Next.js dev overlay renders a `<nextjs-portal>`
              // shadow root and injects ~17 inline `<style>` elements (Bootstrap
              // Reboot reset, component CSS, the `--nextjs-dev-tools-scale`
              // custom property on the host). With `style-src 'self'` in dev
              // Chromium refuses every one of them, so the indicator and its
              // panel render with zero CSS — `:host { all: initial; }` never
              // applies and the panel text bleeds out over the sidebar in
              // normal document flow. Allowing `'unsafe-inline'` in dev is
              // safe and standard; production stays strict.
              "style-src 'self'" +
                (isProduction ? '' : " 'unsafe-inline'"),
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'" +
                (isProduction ? '' : " ws: wss:"),
              "frame-src 'self'",
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
