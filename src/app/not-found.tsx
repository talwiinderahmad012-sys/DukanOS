import Link from 'next/link';
import { Store, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xl">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Store className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            404 Error
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-sm text-gray-500">
            The page or store resource you are looking for might have been moved, deleted, or does not exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign In
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-mono">DukaanOS v1.0.0 — Retail Operating System</p>
        </div>
      </div>
    </div>
  );
}
