export {};

import assert from 'assert';
import enNav from '../lib/i18n/locales/en/nav.json';
import urNav from '../lib/i18n/locales/ur/nav.json';
import enCommon from '../lib/i18n/locales/en/common.json';
import urCommon from '../lib/i18n/locales/ur/common.json';

// Test runner for Navigation History Stack & Back button logic
async function run() {
  console.log('--- STARTING NAVIGATION HISTORY & BACK BUTTON VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function ok(cond: boolean, msg: string) {
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // ==============================================================
  // 1. i18n Translation Keys Verification
  // ==============================================================
  console.log('\n--- 1. Testing i18n Translation Keys ---');
  ok(enNav.back === 'Back', 'en/nav.json contains "back": "Back"');
  ok(urNav.back === 'واپس', 'ur/nav.json contains "back": "واپس"');
  ok(enCommon.back === 'Back', 'en/common.json contains "back": "Back"');
  ok(urCommon.back === 'واپس', 'ur/common.json contains "back": "واپس"');
  ok(typeof enNav.backTooltip === 'string' && enNav.backTooltip.includes('Alt+←'), 'en/nav.json contains backTooltip with Alt+← hint');
  ok(typeof urNav.backTooltip === 'string' && urNav.backTooltip.includes('Alt+←'), 'ur/nav.json contains backTooltip with Alt+← hint');

  // ==============================================================
  // 2. Navigation History State Machine Simulation
  // ==============================================================
  console.log('\n--- 2. Testing Flow: /dashboard → products → detail → Back → Back ---');

  // Helper simulating the NavigationHistoryProvider logic
  class HistoryStateMachine {
    history: string[] = [];
    currentPath: string = '';
    isNavigatingBack = false;
    targetPath: string | null = null;

    constructor(initialPath: string) {
      this.currentPath = initialPath;
      if (this.isAllowed(initialPath)) {
        this.history = [initialPath];
      }
    }

    isAllowed(path: string | null): boolean {
      if (!path) return false;
      return (
        path.startsWith('/dashboard') &&
        path !== '/login' &&
        !path.startsWith('/auth') &&
        !path.startsWith('/api')
      );
    }

    get canGoBack(): boolean {
      return Boolean(
        this.currentPath &&
        this.currentPath.startsWith('/dashboard') &&
        this.currentPath !== '/dashboard'
      );
    }

    get previousPath(): string | null {
      for (let i = this.history.length - 2; i >= 0; i--) {
        const candidate = this.history[i];
        if (candidate && candidate !== this.currentPath && this.isAllowed(candidate)) {
          return candidate;
        }
      }
      return null;
    }

    navigate(newPath: string) {
      this.currentPath = newPath;
      if (!this.isAllowed(newPath)) return;

      if (this.isNavigatingBack) {
        this.isNavigatingBack = false;
        const target = this.targetPath;
        this.targetPath = null;
        if (target) {
          const idx = this.history.lastIndexOf(target);
          if (idx >= 0) {
            this.history = this.history.slice(0, idx + 1);
            return;
          }
        }
        this.history = [newPath];
        return;
      }

      const last = this.history[this.history.length - 1];
      if (last === newPath) return;

      if (this.history.length >= 2 && this.history[this.history.length - 2] === newPath) {
        this.history = this.history.slice(0, this.history.length - 1);
        return;
      }

      this.history.push(newPath);
    }

    goBack(): string {
      if (!this.currentPath || this.currentPath === '/dashboard' || !this.currentPath.startsWith('/dashboard')) {
        return this.currentPath;
      }

      let target = this.previousPath;
      if (!target || !this.isAllowed(target) || target === this.currentPath) {
        target = '/dashboard';
      }

      if (target === '/login' || !target.startsWith('/dashboard')) {
        target = '/dashboard';
      }

      this.isNavigatingBack = true;
      this.targetPath = target;
      this.navigate(target);
      return target;
    }
  }

  // Step 2.1: User lands on /dashboard
  const session1 = new HistoryStateMachine('/dashboard');
  ok(session1.currentPath === '/dashboard', 'Session 1 starts at /dashboard');
  ok(!session1.canGoBack, 'Back button is HIDDEN/DISABLED on /dashboard root');
  ok(session1.history.length === 1 && session1.history[0] === '/dashboard', 'History is ["/dashboard"]');

  // Step 2.2: User navigates to /dashboard/products
  session1.navigate('/dashboard/products');
  ok(session1.currentPath === '/dashboard/products', 'Session 1 navigated to /dashboard/products');
  ok(session1.canGoBack, 'Back button is VISIBLE on /dashboard/products');
  ok(session1.previousPath === '/dashboard', 'Previous path is /dashboard');
  ok(session1.history.length === 2 && session1.history[1] === '/dashboard/products', 'History has ["/dashboard", "/dashboard/products"]');

  // Step 2.3: User navigates to product detail page /dashboard/products/new
  session1.navigate('/dashboard/products/new');
  ok(session1.currentPath === '/dashboard/products/new', 'Session 1 navigated to /dashboard/products/new');
  ok(session1.canGoBack, 'Back button is VISIBLE on product detail/new page');
  ok(session1.previousPath === '/dashboard/products', 'Previous path is /dashboard/products');
  ok(session1.history.length === 3, 'History length is 3');

  // Step 2.4: User clicks Back -> must land on /dashboard/products
  const backTarget1 = session1.goBack();
  ok(backTarget1 === '/dashboard/products', 'First Back click navigates to /dashboard/products');
  ok(session1.currentPath === '/dashboard/products', 'Current path is now /dashboard/products');
  ok(session1.canGoBack, 'Back button remains VISIBLE on /dashboard/products');
  ok(session1.previousPath === '/dashboard', 'Previous path is now /dashboard');
  ok(session1.history.length === 2 && session1.history[1] === '/dashboard/products', 'History stack trimmed correctly to 2 items');

  // Step 2.5: User clicks Back again -> must land on /dashboard
  const backTarget2 = session1.goBack();
  ok(backTarget2 === '/dashboard', 'Second Back click navigates to /dashboard');
  ok(session1.currentPath === '/dashboard', 'Current path is now /dashboard');
  ok(!session1.canGoBack, 'Back button is now HIDDEN on /dashboard root');
  ok(session1.history.length === 1 && session1.history[0] === '/dashboard', 'History stack trimmed to root ["/dashboard"]');

  // ==============================================================
  // 3. Testing Direct Tab Entry: /dashboard/products in new tab
  // ==============================================================
  console.log('\n--- 3. Testing Direct Tab Entry Fallback to /dashboard ---');

  // Open /dashboard/products directly in a new tab (isolated state)
  const session2 = new HistoryStateMachine('/dashboard/products');
  ok(session2.currentPath === '/dashboard/products', 'Session 2 opened directly at /dashboard/products');
  ok(session2.canGoBack, 'Back button is VISIBLE on direct section entry');
  ok(session2.previousPath === null, 'previousPath is null (no previous in-app route)');
  ok(session2.history.length === 1 && session2.history[0] === '/dashboard/products', 'History has only the current page');

  // User clicks Back on direct tab entry -> must fall back to /dashboard
  const directBackTarget = session2.goBack();
  ok(directBackTarget === '/dashboard', 'Back button on direct entry falls back to /dashboard');
  ok(session2.currentPath === '/dashboard', 'Current path is now /dashboard');
  ok(!session2.canGoBack, 'Back button is now HIDDEN on /dashboard');
  ok(session2.history.length === 1 && session2.history[0] === '/dashboard', 'History is reset to ["/dashboard"]');

  // ==============================================================
  // 4. Testing Security: Never Drop to /login or Leave App
  // ==============================================================
  console.log('\n--- 4. Testing Auth Guard & Security Constraints ---');

  const session3 = new HistoryStateMachine('/login');
  ok(!session3.canGoBack, 'Back button is HIDDEN on /login');
  ok(session3.history.length === 0, 'Disallowed /login route is not stored in history');

  const session4 = new HistoryStateMachine('/dashboard/customers/123');
  // Even if history was empty or corrupt, goBack must never navigate to /login
  session4.history = ['/login', '/dashboard/customers/123'];
  const secureTarget = session4.goBack();
  ok(secureTarget === '/dashboard', 'Back never navigates to /login; falls back to /dashboard');
  ok(session4.currentPath !== '/login', 'Authenticated user is never dropped onto /login');

  // ==============================================================
  // 5. Multi-Step Navigation & Sibling Pages
  // ==============================================================
  console.log('\n--- 5. Testing Complex Multi-Step Navigation ---');
  const session5 = new HistoryStateMachine('/dashboard');
  session5.navigate('/dashboard/sales');
  session5.navigate('/dashboard/reports');
  session5.navigate('/dashboard/settings');
  session5.navigate('/dashboard/settings/notifications');

  ok(session5.previousPath === '/dashboard/settings', 'Previous section of notifications is settings');
  session5.goBack();
  ok(session5.currentPath === '/dashboard/settings', 'Landed back on settings');
  session5.goBack();
  ok(session5.currentPath === '/dashboard/reports', 'Landed back on reports');
  session5.goBack();
  ok(session5.currentPath === '/dashboard/sales', 'Landed back on sales');
  session5.goBack();
  ok(session5.currentPath === '/dashboard', 'Landed back on /dashboard');
  ok(!session5.canGoBack, 'Back is hidden on /dashboard');

  console.log(`\n==============================================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Error running test:', err);
  process.exit(1);
});

