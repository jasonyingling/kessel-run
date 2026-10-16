import { test, expect, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { OutputContext, WorkspaceOverview } from '../../src/lib/kessel-run/app-contracts';

const origin = 'http://127.0.0.1:3197';
async function fixture(context: BrowserContext, testInfo: TestInfo, suffix: string) {
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'workspace.json'), { force: true });
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'selection.json'), { force: true });
  await context.addCookies([{ name: 'kr-local-session', value: process.env.KR_E2E_SESSION!, url: origin, httpOnly: true, sameSite: 'Strict' }]);
  const headers = { origin, 'x-kr-csrf': 'local' };
  const created = await context.request.post('/api/kessel-run/local/workspace', { headers, data: { operationId: crypto.randomUUID(), root: join(process.env.KR_E2E_ROOT!, `polish-${testInfo.project.name}-${suffix}`), title: 'Polish review' } });
  expect(created.ok()).toBe(true);
  const overview = async (): Promise<WorkspaceOverview> => (await context.request.get('/api/kessel-run/local/workspace')).json();
  const initial = await overview();
  async function command<T>(action: string, input: Record<string, unknown>): Promise<T> {
    const response = await context.request.post('/api/kessel-run/local/content', { headers: { ...headers, 'x-kr-workspace-ref': String(initial.workspace.id) }, data: { action, input } });
    expect(response.ok(), await response.text()).toBe(true); return response.json();
  }
  async function populate() {
    const publication = await command<{ id: string }>('publication', { operationId: crypto.randomUUID(), expectedHash: initial.workspace.hash, title: 'Field Notes', purpose: 'Concrete observations.', presets: ['Article'] });
    const input = { publicationId: publication.id, prose: 'Use supplied observations.', scope: 'publication', parent: null, authorId: null };
    const preview = await command<{ publicationHash: string }>('profile-preview', input);
    const voice = await command<{ id: string; version: number }>('profile-import', { ...input, operationId: crypto.randomUUID(), expectedHash: preview.publicationHash, title: 'Field voice', provenance: 'Synthetic preferences, explicitly confirmed.' });
    const piece = await command<{ id: string }>('piece', { operationId: crypto.randomUUID(), expectedHash: (await overview()).publications[0].hash, publicationId: publication.id, title: 'A useful detail', brief: 'Supplied context.', mode: 'guided' });
    const preset = (await overview()).presets[0];
    const output = await command<{ id: string }>('output', { operationId: crypto.randomUUID(), expectedHash: (await overview()).pieces[0].hash, pieceId: piece.id, title: 'An observation', format: String(preset.format), preset: String(preset.id), voice: { profileId: voice.id, version: voice.version }, author: null });
    async function save(prose: string) {
      const saved = await command<OutputContext>('context', { outputId: output.id });
      await command('editor', { operationId: crypto.randomUUID(), expectedHash: saved.output.hash, expectedContextHash: saved.contextHash, outputId: output.id, prose });
      const current = await command<OutputContext>('context', { outputId: output.id });
      return command<{ handoff: string }>('export', { outputId: output.id, expectedRevision: current.output.currentRevision, expectedHash: current.output.hash, expectedContextHash: current.contextHash });
    }
    return { publication, piece, output, save };
  }
  return { overview, populate };
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}
function contrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
async function colors(locator: Locator) {
  return locator.evaluate(element => {
    const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const background = (node: Element | null): string => { if (!node) return 'rgb(255, 255, 255)'; const value = getComputedStyle(node).backgroundColor; return value === 'rgba(0, 0, 0, 0)' ? background(node.parentElement) : value; };
    const style = getComputedStyle(element);
    return { text: rgb(style.color), background: rgb(background(element)), surrounding: rgb(background(element.parentElement)), border: rgb(style.borderTopColor), outline: rgb(style.outlineColor), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), opacity: style.opacity };
  });
}
async function readable(locator: Locator, boundary = false) {
  const value = await colors(locator);
  expect(contrast(value.text, value.background)).toBeGreaterThanOrEqual(4.5);
  expect(value.opacity).toBe('1');
  if (boundary) {
    expect(contrast(value.border, value.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(value.border, value.surrounding)).toBeGreaterThanOrEqual(3);
  }
}

test('editorial surfaces retain contrast, brand identity and deliberate control states', async ({ page, context }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; const inference: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && /\/local\/(writing|cleanup|connection-test)/.test(request.url())) inference.push(request.url()); });
  const data = await fixture(context, info, 'surfaces'); const populated = await data.populate();
  await populated.save('A supplied observation with [supporting notes](https://example.com/notes).');
  await page.goto('/kessel-run');
  await expect(page.getByText('1 piece · 1 output', { exact: true })).toBeVisible();
  const brand = page.getByRole('link', { name: 'Kessel Run', exact: true });
  await expect(brand.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(await brand.locator('svg').evaluate(element => getComputedStyle(element).width)).toBe(info.project.name === 'desktop' ? '28px' : '24px');
  await page.keyboard.press('Tab'); await brand.focus();
  expect((await colors(brand)).outlineStyle).not.toBe('none'); expect((await colors(brand)).outlineWidth).toBeGreaterThanOrEqual(2);
  expect(contrast((await colors(brand)).outline, (await colors(brand)).surrounding)).toBeGreaterThanOrEqual(3);
  expect(await page.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/geist/i);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  for (const asset of ['/icon.svg', '/favicon.ico', '/kessel-run-mark.svg']) expect((await context.request.get(asset)).ok()).toBe(true);
  expect(await (await context.request.get('/icon.svg')).text()).toContain('m11 14 10-9h7L16 16l12 11h-7L11 18z');
  await capture(page, info, 'overview-brand');
  const create = page.getByRole('button', { name: 'New publication', exact: true });
  await readable(create, true);
  await create.hover(); await readable(create, true); await page.mouse.down();
  await expect.poll(() => create.evaluate(element => getComputedStyle(element).transform)).toBe(info.project.name === 'mobile-reduced-motion' ? 'none' : 'matrix(0.96, 0, 0, 0.96, 0, 0)');
  await page.mouse.up(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await create.focus(); await page.keyboard.down('Space');
  expect(await create.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  await page.keyboard.up('Space'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto(`/kessel-run/voices?publication=${populated.publication.id}`);
  const staticCard = page.locator('.kr-studio article').first();
  const shadow = await staticCard.evaluate(element => getComputedStyle(element).boxShadow); await staticCard.hover();
  expect(await staticCard.evaluate(element => getComputedStyle(element).boxShadow)).toBe(shadow);
  await page.getByRole('button', { name: 'Write a starter voice', exact: true }).click();
  await readable(page.getByRole('button', { name: 'Write a starter voice', exact: true }), true);
  await readable(page.getByLabel('Desired reader experience'), true);
  await readable(page.getByRole('button', { name: 'Get AI help', exact: true }));
  await capture(page, info, 'studio-controls');
  await page.getByRole('button', { name: 'Discard voice draft', exact: true }).click();
  await page.goto(`/kessel-run/outputs/${populated.output.id}`);
  await expect(page.getByLabel('Output prose')).toHaveValue(/supporting notes/);
  await expect(page.getByText('Ready. Each AI turn may incur API charges.', { exact: true })).toBeVisible();
  const save = page.getByRole('button', { name: 'Save prose', exact: true });
  await expect(save).toBeDisabled(); await readable(save, true);
  const before = await save.evaluate(element => getComputedStyle(element).backgroundColor);
  await save.hover(); await page.mouse.down();
  expect(await save.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  expect(await save.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(before); await page.mouse.up();
  const exportButton = page.getByRole('button', { name: 'Export Markdown', exact: true });
  await exportButton.hover(); await page.mouse.down();
  expect(await exportButton.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  await page.mouse.move(0, 0); await page.mouse.up();
  await page.getByText('Markdown preview', { exact: true }).click();
  const paperLink = page.getByRole('link', { name: 'supporting notes', exact: true });
  await readable(paperLink); expect(await paperLink.evaluate(element => getComputedStyle(element).textDecorationLine)).toContain('underline');
  await paperLink.hover(); await readable(paperLink);
  await page.locator('.kr-paper summary').filter({ hasText: 'Markdown preview' }).focus(); await page.keyboard.press('Tab');
  await expect(paperLink).toBeFocused();
  expect((await colors(paperLink)).outlineStyle).not.toBe('none'); expect((await colors(paperLink)).outlineWidth).toBeGreaterThanOrEqual(2);
  expect(contrast((await colors(paperLink)).outline, (await colors(paperLink)).surrounding)).toBeGreaterThanOrEqual(3);
  await readable(page.getByLabel('Output prose'), true);
  await readable(page.locator('.kr-composer-note').first());
  await capture(page, info, 'desk-paper');
  await page.goto('/kessel-run/settings');
  await expect(page.getByText('Each client has a separate revocable token.', { exact: true })).toBeVisible();
  await readable(page.getByLabel('Client name', { exact: true }), true);
  const connection = page.getByRole('button', { name: 'Create connection', exact: true });
  await expect(connection).toBeDisabled(); await readable(connection, true);
  await page.getByLabel('Client name', { exact: true }).fill('Local agent'); await expect(connection).toBeEnabled(); await readable(connection, true);
  await capture(page, info, 'settings-settled');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // CSS zoom exercises doubled content at the configured viewport without changing browser fixture isolation.
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, info, 'settings-200-percent');
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  expect(inference).toEqual([]); expect(errors).toEqual([]);
});

test('handoff preview and confirmation keep the selected filename and exact content', async ({ page, context }, info) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const original = window.fetch;
    (window as unknown as { handoffPreviewReads: number }).handoffPreviewReads = 0;
    window.fetch = async (input, init) => {
      let action = ''; try { action = JSON.parse(String(init?.body ?? '{}')).action; } catch { /* Preserve unrelated requests. */ }
      const response = await original(input, init);
      if (action === 'handoff-preview') {
        const json = response.json.bind(response);
        response.json = async () => { const value = await json(); queueMicrotask(() => { (window as unknown as { handoffPreviewReads: number }).handoffPreviewReads++; }); return value; };
      }
      return response;
    };
  });
  const source = await fixture(context, info, 'handoff-source'); const populated = await source.populate();
  const a = (await populated.save('Alpha observation.')).handoff;
  const b = (await populated.save('Beta observation.')).handoff;
  const destination = await fixture(context, info, 'handoff-destination');
  await page.goto('/kessel-run'); await page.getByText('Restore an exported Markdown handoff', { exact: true }).click();
  const file = page.getByLabel('Exported handoff file'); const preview = page.getByRole('button', { name: 'Preview restoration', exact: true });
  await file.setInputFiles({ name: 'a.md', mimeType: 'text/markdown', buffer: Buffer.from(a) }); await expect(preview).toBeEnabled();
  await file.setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await expect(page.getByText('invalid.txt', { exact: true })).toBeVisible(); await expect(preview).toBeDisabled();
  await file.setInputFiles([]); await expect(preview).toBeDisabled(); await expect(page.getByText('No file selected.', { exact: true })).toBeVisible();
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  let requestSeen!: () => void; const started = new Promise<void>(resolve => { requestSeen = resolve; });
  let responseSent!: () => void; const sent = new Promise<void>(resolve => { responseSent = resolve; });
  let confirmed: Record<string, unknown> | null = null;
  await page.route('**/api/kessel-run/local/content', async route => {
    const command = route.request().postDataJSON();
    if (command.action === 'handoff-preview' && command.input.markdown === a) { const response = await route.fetch(); requestSeen(); await held; await route.fulfill({ response }); responseSent(); }
    else { if (command.action === 'handoff-import') confirmed = command.input; await route.continue(); }
  });
  await file.setInputFiles({ name: 'a.md', mimeType: 'text/markdown', buffer: Buffer.from(a) }); await preview.click(); await started;
  await file.setInputFiles({ name: 'b.md', mimeType: 'text/markdown', buffer: Buffer.from(b) }); await preview.click();
  await expect(page.getByText('Beta observation.', { exact: true })).toBeVisible(); release(); await sent;
  await expect.poll(() => page.evaluate(() => (window as unknown as { handoffPreviewReads: number }).handoffPreviewReads)).toBe(2);
  await expect(page.getByText('Preview of b.md.', { exact: false })).toBeVisible();
  await expect(page.getByText('Alpha observation.', { exact: true })).toHaveCount(0);
  await capture(page, info, 'handoff-reviewed-b');
  await page.getByRole('button', { name: 'Confirm restoration of these editorial records', exact: true }).click();
  await expect(page.getByText('Restored into the selected empty workspace.', { exact: true })).toBeVisible();
  expect(confirmed).toMatchObject({ markdown: b });
  expect((await destination.overview()).publications).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Confirm restoration of these editorial records', exact: true })).toHaveCount(0);
});
