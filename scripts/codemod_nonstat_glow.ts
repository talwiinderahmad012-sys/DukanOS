/** Codemod #2: converts remaining NON-STAT GlowCard/Card sites to SurfaceCard. Run: npx tsx scripts/codemod_nonstat_glow.ts */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');
const GLOW_PROPS = ['variant', 'hue', 'index', 'interactive', 'padded', 'contentClassName'];

function stripGlowProps(a: string): string {
  const spans: { keep: boolean; s: number; e: number }[] = [];
  let i = 0;
  while (i < a.length) {
    while (i < a.length && /\s/.test(a[i])) i++;
    const nm = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(a.slice(i));
    if (!nm) {
      i++;
      continue;
    }
    const s = i;
    const name = nm[0];
    let j = i + name.length;
    while (j < a.length && /\s/.test(a[j])) j++;
    if (a[j] === '=') {
      j++;
      while (j < a.length && /\s/.test(a[j])) j++;
      const q = a[j];
      if (q === '"' || q === "'") {
        const end = a.indexOf(q, j + 1);
        j = end === -1 ? a.length : end + 1;
      } else if (q === '{') {
        let d = 0;
        while (j < a.length) {
          if (a[j] === '{') d++;
          else if (a[j] === '}') {
            d--;
            if (d === 0) {
              j++;
              break;
            }
          }
          j++;
        }
      } else {
        const bare = /^[^\s]+/.exec(a.slice(j));
        j += bare ? bare[0].length : 0;
      }
    }
    spans.push({ keep: !GLOW_PROPS.includes(name), s, e: j });
    i = j;
  }
  return spans.filter((x) => x.keep).map((x) => a.slice(x.s, x.e)).join(' ').trim();
}

type Token = { kind: 'text'; text: string } | { kind: 'tag'; full: string; name: string; selfClose: boolean; attrs: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      out.push({ kind: 'text', text: src.slice(i) });
      break;
    }
    if (lt > i) out.push({ kind: 'text', text: src.slice(i, lt) });
    const m = /^<([A-Za-z][A-Za-z0-9._]*)/.exec(src.slice(lt));
    if (!m) {
      out.push({ kind: 'text', text: '<' });
      i = lt + 1;
      continue;
    }
    let j = lt + 1;
    let d = 0;
    let str: string | null = null;
    while (j < src.length) {
      const c = src[j];
      if (str) {
        if (c === '\\') j++;
        else if (c === str) str = null;
      } else if (c === '"' || c === "'" || c === '`') str = c;
      else if (c === '/' && src[j + 1] === '/') j = src.indexOf('\n', j);
      else if (c === '/' && src[j + 1] === '*') j = src.indexOf('*/', j) + 1;
      else if (c === '{') d++;
      else if (c === '}') d = Math.max(0, d - 1);
      else if (c === '>' && d === 0) break;
      j++;
    }
    const full = src.slice(lt, j + 1);
    const selfClose = src[j - 1] === '/';
    const attrs = full.slice(m[1].length + 1, full.length - (selfClose ? 2 : 1)).trim();
    out.push({ kind: 'tag', full, name: m[1], selfClose, attrs });
    i = j + 1;
  }
  return out;
}


/** Files where EVERY remaining GlowCard usage is a non-stat surface. */
const CONVERT_ALL = [
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/register/page.tsx',
  'src/app/dashboard/analytics/branches/branches-analytics-client.tsx',
  'src/app/dashboard/reports/reports-page-client.tsx',
  'src/app/docs/page.tsx',
  'src/components/advisor/advisor-page-view.tsx',
  'src/components/business/business-management-view.tsx',
  'src/components/communications/communications-view.tsx',
  'src/app/dashboard/growth/growth-client.tsx',
  'src/components/onboarding/onboarding-checklist.tsx',
  'src/components/pos/pos-checkout-screen.tsx',
  'src/components/pos/pos-terminal.tsx',
  'src/components/settings/settings-hub-view.tsx',
  'src/components/settings/system-info-view.tsx',
  'src/components/settings/usage-view.tsx',
  'src/components/settings/branches-view.tsx',
  'src/components/settings/members-view.tsx',
  'src/components/settings/receipts-settings-form.tsx',
  'src/app/dashboard/platform/plans/plans-client.tsx',
];

/** Mixed files: convert only matching sites. Predicate receives the attrs text. */
const CONVERT_MATCHED: Record<string, (attrs: string) => boolean> = {
  'src/components/cctv/camera-list-view.tsx': (a) => a.includes('key={camera.id}'),
  'src/components/sync/sync-center-view.tsx': (a) => a.trim().startsWith('index={0}'),
  'src/components/customers/customer-profile-view.tsx': (a) => /variant\s*=\s*["']card["']/.test(a),
  'src/app/dashboard/purchases/[id]/purchase-detail-client.tsx': (a) => /variant\s*=\s*["']card["']/.test(a),
  'src/app/dashboard/sales/[id]/sale-detail-client.tsx': (a) => /variant\s*=\s*["']card["']/.test(a),
  'src/app/dashboard/suppliers/[id]/supplier-detail-client.tsx': (a) => /variant\s*=\s*["']card["']/.test(a),
  'src/components/feedback/feedback-dashboard-view.tsx': (a) => /variant\s*=\s*["']card["']/.test(a),
  'src/components/products/inventory-adjustment-form.tsx': (a) => /variant\s*=\s*["']panel["']/.test(a),
  'src/components/purchases/purchase-form.tsx': (a) => /variant\s*=\s*["']panel["']/.test(a),
};

const report: { file: string; converted: number }[] = [];

function processFile(absFile: string, match?: (a: string) => boolean) {
  const src = fs.readFileSync(absFile, 'utf8');
  if (!src.includes('<GlowCard') && !src.includes('<Card')) return;

  const tokens = tokenize(src);
  const decisions = new Map<number, string>();
  let converted = 0;

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind !== 'tag') continue;
    if (tok.name !== 'GlowCard' && tok.name !== 'Card') continue;
    if (match && !match(tok.attrs)) continue;
    const attrs = stripGlowProps(tok.attrs);
    decisions.set(
      t,
      tok.selfClose ? `<SurfaceCard${attrs ? ' ' + attrs : ''} />` : `<SurfaceCard${attrs ? ' ' + attrs : ''}>`
    );
    converted++;
  }
  if (converted === 0) return;

  let out = '';
  const stack: { name: string; conv: boolean }[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind === 'text') {
      out += tok.text;
      continue;
    }
    const dec = decisions.get(t);
    if (dec) {
      out += dec;
      if (!tok.selfClose) stack.push({ name: tok.name, conv: true });
      continue;
    }
    if (tok.name === 'GlowCard' || tok.name === 'Card') {
      out += tok.full;
      if (!tok.selfClose) stack.push({ name: tok.name, conv: false });
      continue;
    }
    if (tok.full.startsWith('</')) {
      const top = stack[stack.length - 1];
      if (top && top.conv && top.name === tok.name) {
        out += '</SurfaceCard>';
        stack.pop();
        continue;
      }
      if (top && top.name === tok.name) stack.pop();
      out += tok.full;
      continue;
    }
    out += tok.full;
  }

  // Import cleanup: drop GlowCard/Card names when fully unused; always add SurfaceCard import
  const glowLeft = out.includes('<GlowCard');
  const cardLeft = /<Card[\s>]/.test(out);
  const importRe = /import\s*\{([^}]*)\}\s*from\s*(['"])([^'"]*)\2;/g;
  out = out.replace(importRe, (m0, names1: string, q: string, mod: string) => {
    const names = names1
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const hadGlow = names.includes('GlowCard');
    const hadCard = names.includes('Card');
    if ((hadGlow && glowLeft) || (hadCard && cardLeft) || (!hadGlow && !hadCard)) return m0;
    const names2 = names.filter((s) => s !== 'GlowCard' && s !== 'Card');
    return names2.length ? `import { ${names2.join(', ')} } from ${q}${mod}${q};` : '';
  });
  if (!/import[^;]*SurfaceCard/.test(out)) {
    out = `import { SurfaceCard } from '@/components/ui/SurfaceCard';\n` + out;
  }
  // collapse accidental double blank lines from removed imports
  out = out.replace(/\n\n\n+/g, '\n\n');

  fs.writeFileSync(absFile, out, 'utf8');
  report.push({ file: path.relative(SRC_ROOT, absFile).replace(/\\/g, '/'), converted });
}

function srcGlowLeft(out: string) {
  return out.includes('<GlowCard');
}
function srcCardLeft(out: string) {
  return /<Card[\s>]/.test(out);
}

for (const rel of CONVERT_ALL) {
  const p = path.join(SRC_ROOT, rel);
  if (fs.existsSync(p)) processFile(p);
}
for (const [rel, match] of Object.entries(CONVERT_MATCHED)) {
  const p = path.join(SRC_ROOT, rel);
  if (fs.existsSync(p)) processFile(p, match);
}

let total = 0;
for (const r of report) {
  total += r.converted;
  console.log(`${r.file}: converted=${r.converted}`);
}
console.log(`TOTAL converted=${total} files=${report.length}`);
