export {};
require('dotenv').config();

const BASE = 'http://127.0.0.1:3000';

class CDPClient {
  private ws: any;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();

  constructor(wsUrl: string) {
    this.ws = new (globalThis as any).WebSocket(wsUrl);
  }

  async ready(): Promise<void> {
    if (this.ws.readyState === 1) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err: any) => reject(err);
      this.ws.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id)!;
            this.callbacks.delete(msg.id);
            cb(msg.result || msg);
          }
        } catch (e) {}
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const id = ++this.id;
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function main() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = (await tabsRes.json()) as any[];
  const pageTab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
  if (!pageTab) {
    console.log('No page tab found');
    return;
  }

  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.ready();

  await client.send('Page.navigate', { url: `${BASE}/dashboard/categories` });
  await new Promise((r) => setTimeout(r, 2000));

  const check = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const panel = document.querySelector('.glow-panel.overflow-hidden') || 
                    Array.from(document.querySelectorAll('.glow-panel')).find(p => p.querySelector('table, form, .divide-y, input, button, nav')) || 
                    document.querySelector('.glow-panel');
      if (!panel) return { error: 'No panel' };

      const input = panel.querySelector('input:not([type="hidden"])');
      let inputOk = true;
      if (input) {
        input.focus();
        inputOk = document.activeElement === input;
      }

      const select = panel.querySelector('select');
      let selectOk = select ? !select.disabled : true;

      const btns = Array.from(panel.querySelectorAll('button:not([disabled]), a[href]:not([disabled])'));
      const btnChecks = [];
      for (const b of btns.slice(0, 5)) {
        b.scrollIntoView({ behavior: 'instant', block: 'center' });
        const bRect = b.getBoundingClientRect();
        const hit = document.elementFromPoint(bRect.left + bRect.width / 2, bRect.top + bRect.height / 2);
        btnChecks.push({
          tag: b.tagName,
          text: b.textContent?.trim().slice(0, 30),
          rect: { top: bRect.top, left: bRect.left, w: bRect.width, h: bRect.height },
          hitTag: hit ? hit.tagName : null,
          hitClass: hit ? hit.className : null,
          isContains: hit ? b.contains(hit) : false,
          isEqual: hit === b
        });
      }

      return {
        panelTag: panel.tagName,
        panelClass: panel.className,
        inputFound: Boolean(input),
        inputOk,
        selectFound: Boolean(select),
        selectOk,
        btnChecks
      };
    })()`,
    returnByValue: true
  });

  console.log('Categories check:', JSON.stringify(check.result?.value, null, 2));
  client.close();
}

main().catch(console.error);
