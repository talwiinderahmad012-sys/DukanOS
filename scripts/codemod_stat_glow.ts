/** Codemod: converts <GlowCard variant="panel"> into <SurfaceCard>. Run: npx tsx scripts/codemod_stat_glow.ts */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');
const GLOW_PROPS = ['variant', 'hue', 'index', 'interactive', 'padded', 'contentClassName'];

/** Strip top-level attributes whose names are in GLOW_PROPS (string/brace aware). */
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

/** Split source into text + opening-tag tokens (scan to matching > respecting strings/braces/comments). */
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


function walk(dir: string, files: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.isFile() && /\.tsx$/.test(e.name)) files.push(p);
  }
  return files;
}

const report: { file: string; converted: number }[] = [];

function processFile(file: string) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<GlowCard')) return;

  const tokens = tokenize(src);
  const decisions = new Map<number, string>();
  let converted = 0;

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind !== 'tag' || tok.name !== 'GlowCard') continue;
    if (!/variant\s*=\s*["']panel["']/.test(tok.attrs)) continue;
    const attrs = stripGlowProps(tok.attrs);
    decisions.set(t, tok.selfClose ? `<SurfaceCard${attrs ? ' ' + attrs : ''} />` : `<SurfaceCard${attrs ? ' ' + attrs : ''}>`);
    converted++;
  }
  if (decisions.size === 0) return;

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
    if (tok.name === 'GlowCard') {
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

  // Rewrite the GlowCard import: SurfaceCard + preserve other names (e.g. type GlowHue)
  const im = /import\s*\{([^}]*)\}\s*from\s*(['"])([^'"]*)\2;/.exec(out);
  if (im && /(^|[\s,])GlowCard([\s,]|$)/.test(im[1])) {
    const names = im[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== 'GlowCard');
    if (!names.includes('SurfaceCard')) names.push('SurfaceCard');
    out = out.replace(im[0], `import { ${names.join(', ')} } from ${im[2]}${im[3]}${im[2]};`);
  } else {
    out = `import { SurfaceCard } from '@/components/ui/SurfaceCard';\n` + out;
  }

  fs.writeFileSync(file, out, 'utf8');
  report.push({ file: path.relative(SRC_ROOT, file).replace(/\\/g, '/'), converted });
}

// providers.tsx: remove GlowPanelListener mount + import
const providersPath = path.join(SRC_ROOT, 'src', 'components', 'providers', 'providers.tsx');
if (fs.existsSync(providersPath)) {
  let psrc = fs.readFileSync(providersPath, 'utf8');
  psrc = psrc.replace(/\n\s*<GlowPanelListener\s*\/>/, '');
  psrc = psrc.replace(/import \{ GlowPanelListener \} from '@\/components\/ui\/glow-panel-listener';\n/, '');
  fs.writeFileSync(providersPath, psrc, 'utf8');
  console.log('providers.tsx: GlowPanelListener removed');
}

let total = 0;
for (const f of walk(path.join(SRC_ROOT, 'src'))) processFile(f);
for (const r of report) {
  total += r.converted;
  console.log(`${r.file}: converted=${r.converted}`);
}
console.log(`TOTAL converted=${total} files=${report.length}`);
