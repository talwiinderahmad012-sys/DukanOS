export {};

require('dotenv').config();
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

import { spawn } from 'child_process';

const BASE = 'http://127.0.0.1:3000';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\talwi\\AppData\\Local\\Temp\\edge-css-inspect',
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const newTab = (await newTabRes.json()) as any;
  const ws = new (globalThis as any).WebSocket(newTab.webSocketDebuggerUrl);

  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  function send(method: string, params: any = {}): Promise<any> {
    return new Promise((res) => {
      const curId = ++id;
      const handler = (event: any) => {
        const d = JSON.parse(event.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          res(d.result || d);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('CSS.enable');

  // Navigate to login or products
  await send('Page.navigate', { url: `${BASE}/login` });
  await new Promise((r) => setTimeout(r, 2000));

  const doc = await send('DOM.getDocument');
  const rootNodeId = doc.root.nodeId;

  // Let's create a test element in the page with class glow-panel
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const div = document.createElement('div');
      div.className = 'glow-panel glow-emerald';
      div.id = 'test-panel-inspect';
      div.style.width = '200px';
      div.style.height = '200px';
      document.body.appendChild(div);
      return div.id;
    })()`,
    returnByValue: true,
  });

  const nodeRes = await send('DOM.querySelector', {
    nodeId: rootNodeId,
    selector: '#test-panel-inspect',
  });
  const nodeId = nodeRes.nodeId;
  console.log('Created and found test node id:', nodeId);

  // Get matched styles before hover
  const stylesBefore = await send('CSS.getMatchedStylesForNode', { nodeId });
  console.log('PseudoElements before hover:', stylesBefore.pseudoElements?.length);
  for (const pe of stylesBefore.pseudoElements || []) {
    console.log(`Pseudo: ${pe.pseudoType}`);
    for (const mr of pe.matches || []) {
      console.log(`   Selector: ${mr.rule.selectorList.text}`);
      for (const p of mr.rule.style.cssProperties) {
        if (p.name === 'opacity' || p.name === 'content') {
          console.log(`      ${p.name}: ${p.value}`);
        }
      }
    }
  }

  // Force pseudo-state :hover on node
  await send('CSS.forcePseudoState', {
    nodeId,
    forcedPseudoClasses: ['hover'],
  });

  // Get matched styles after forced :hover
  const stylesHover = await send('CSS.getMatchedStylesForNode', { nodeId });
  console.log('\nAFTER FORCED :hover');
  for (const pe of stylesHover.pseudoElements || []) {
    console.log(`Pseudo: ${pe.pseudoType}`);
    for (const mr of pe.matches || []) {
      console.log(`   Selector: ${mr.rule.selectorList.text}`);
      for (const p of mr.rule.style.cssProperties) {
        if (p.name === 'opacity' || p.name === 'content') {
          console.log(`      ${p.name}: ${p.value}`);
        }
      }
    }
  }

  // Check computed opacity
  const compRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const div = document.getElementById('test-panel-inspect');
      return window.getComputedStyle(div, '::before').opacity;
    })()`,
    returnByValue: true,
  });
  console.log('Computed ::before opacity with forced :hover:', compRes.result?.value);

  edgeProcess.kill();
}

main().catch(console.error);
