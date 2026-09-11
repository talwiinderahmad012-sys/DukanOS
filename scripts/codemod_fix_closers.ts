/** Codemod #3: repairs closing tags for converted SurfaceCard opens. Run: npx tsx scripts/codemod_fix_closers.ts */
import * as fs from 'fs';
import * as path from 'path';

type Tok =
  | { kind: 'text'; text: string }
  | { kind: 'open'; full: string; name: string; selfClose: boolean }
  | { kind: 'close'; full: string; name: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      out.push({ kind: 'text', text: src.slice(i) });
      break;
    }
    if (lt > i) out.push({ kind: 'text', text: src.slice(i, lt) });

    // closing tag: </Name ...>
    const cm = /^<\/([A-Za-z][A-Za-z0-9._]*)/.exec(src.slice(lt));
    if (cm) {
      let j = lt;
      let d = 0;
      let s: string | null = null;
      while (j < src.length) {
        const c = src[j];
        if (s) {
          if (c === '\\') j++;
          else if (c === s) s = null;
        } else if (c === '"' || c === "'" || c === '`') s = c;
        else if (c === '{') d++;
        else if (c === '}') d = Math.max(0, d - 1);
        else if (c === '>' && d === 0) break;
        j++;
      }
      out.push({ kind: 'close', full: src.slice(lt, j + 1), name: cm[1] });
      i = j + 1;
      continue;
    }

    const om = /^<([A-Za-z][A-Za-z0-9._]*)/.exec(src.slice(lt));
    if (!om) {
      out.push({ kind: 'text', text: '<' });
      i = lt + 1;
      continue;
    }
    let j = lt + 1;
    let d = 0;
    let s: string | null = null;
    while (j < src.length) {
      const c = src[j];
      if (s) {
        if (c === '\\') j++;
        else if (c === s) s = null;
      } else if (c === '"' || c === "'" || c === '`') s = c;
      else if (c === '/' && src[j + 1] === '/') j = src.indexOf('\n', j);
      else if (c === '/' && src[j + 1] === '*') j = src.indexOf('*/', j) + 1;
      else if (c === '{') d++;
      else if (c === '}') d = Math.max(0, d - 1);
      else if (c === '>' && d === 0) break;
      j++;
    }
    const full = src.slice(lt, j + 1);
    out.push({ kind: 'open', full, name: om[1], selfClose: src[j - 1] === '/' });
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

let repairedFiles = 0;
let repairedTags = 0;

for (const file of walk(path.resolve(__dirname, '..', 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<SurfaceCard')) continue;

  const toks = tokenize(src);
  const stack: { name: string; conv: boolean }[] = [];
  let repairs = 0;
  let out = '';

  for (const tok of toks) {
    if (tok.kind === 'text') {
      out += tok.text;
      continue;
    }
    if (tok.kind === 'open') {
      out += tok.full;
      if (!tok.selfClose) {
        if (tok.name === 'SurfaceCard') stack.push({ name: tok.name, conv: true });
        else stack.push({ name: tok.name, conv: false });
      }
      continue;
    }
    // close
    const top = stack[stack.length - 1];
    if (top && top.conv && tok.name !== 'SurfaceCard') {
      // Stale closer (</GlowCard> or </Card>) whose opening tag was converted.
      // Proper nesting guarantees this closer belongs to the converted open on top.
      out += `</SurfaceCard>`;
      stack.pop();
      repairs++;
      continue;
    }
    if (top && tok.name === top.name) stack.pop();
    out += tok.full;
  }

  if (repairs > 0) {
    fs.writeFileSync(file, out, 'utf8');
    repairedFiles++;
    repairedTags += repairs;
    console.log(`${path.relative(process.cwd(), file).replace(/\\/g, '/')}: repaired=${repairs}`);
  }
}
console.log(`TOTAL repaired=${repairedTags} files=${repairedFiles}`);
