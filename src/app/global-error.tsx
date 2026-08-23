'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Application Error:', error?.message);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Application Error
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Something Went Wrong</h1>
              <p className="text-sm text-gray-500">
                An unexpected error occurred while processing your request. Our system has logged the diagnostic incident.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
              >
                <Home className="w-4 h-4" />
                Return to Dashboard
              </Link>
            </div>

            {error?.digest && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-mono">Reference ID: {error.digest}</p>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
