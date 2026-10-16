import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './onboarding-fixture';

test('real keyless launcher, name-only creation, lost response, duplicate click and restart', async ({ page, launcher }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const modelCalls: string[] = [];
  page.on('request', request => { if (/\/local\/(writing|cleanup|connection-test)/.test(request.url()) && request.method() === 'POST') modelCalls.push(request.url()); });
  const pairUrl = await launcher.start();
  await page.goto(`${launcher.origin}/kessel-run`);
  await expect(page.getByRole('heading', { name: 'Open your local browser link' })).toBeVisible();
  let unblock!: () => void;
  const loading = new Promise<void>(resolve => { unblock = resolve; });
  await page.route('**/api/kessel-run/local/bootstrap', async route => { await loading; await route.continue(); });
  await page.goto(pairUrl);
  await expect(page.getByRole('heading', { name: 'Opening your writing workspace…' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('entry-loading.png'), fullPage: true });
  unblock();
  await expect(page.getByRole('heading', { name: 'Create your first publication' })).toBeVisible();
  await page.unroute('**/api/kessel-run/local/bootstrap');
  expect(page.url()).not.toContain('#pair');
  await page.screenshot({ path: testInfo.outputPath('entry-empty.png'), fullPage: true });
  await page.getByLabel('Publication name', { exact: true }).fill(`Review ${testInfo.project.name}`);
  await writeFile(join(launcher.root, 'content'), 'Synthetic unavailable default parent');
  await page.getByRole('button', { name: 'Create publication', exact: true }).click();
  await expect(page.getByText('This location is unavailable.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Publication name', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Publication name', { exact: true })).toHaveValue(`Review ${testInfo.project.name}`);
  await page.screenshot({ path: testInfo.outputPath('entry-location-error.png'), fullPage: true });
  await rm(join(launcher.root, 'content'));
  // The real server commits; only delivery of its first response is lost.
  let first = true;
  await page.route('**/api/kessel-run/local/bootstrap', async route => {
    if (route.request().method() === 'POST' && first) { first = false; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Create publication', exact: true }).dblclick();
  await expect(page.getByRole('button', { name: 'Resume creation', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Publication name', { exact: true })).toHaveValue(`Review ${testInfo.project.name}`);
  await page.screenshot({ path: testInfo.outputPath('entry-recovery.png'), fullPage: true });
  await page.getByRole('button', { name: 'Resume creation', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/publications\/[a-f0-9-]+$/);
  const publicationUrl = page.url();
  await expect(page.getByRole('heading', { name: `Review ${testInfo.project.name}`, exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('entry-success.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload(); await expect(page).toHaveURL(publicationUrl);
  const nextPairUrl = await launcher.start();
  await page.goto(nextPairUrl);
  await page.getByRole('link', { name: `Review ${testInfo.project.name}` }).click();
  await expect(page).toHaveURL(publicationUrl);
  const config = JSON.parse(await readFile(join(launcher.root, 'private', 'workspace.json'), 'utf8'));
  expect(await readdir(join(config.root, 'Publications'))).toHaveLength(1);
  expect(modelCalls).toEqual([]); expect(errors).toEqual([]);
});
test('unavailable browser recovery storage shows an error before any creation request', async ({ page, launcher }) => {
  const url = await launcher.start();
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) { if (key.startsWith('kr-operation:')) throw new Error('Synthetic storage denial'); return original.call(this, key); };
  });
  let writes = 0;
  page.on('request', request => { if (request.url().endsWith('/local/bootstrap') && request.method() === 'POST') writes++; });
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Creation recovery needs attention' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create publication', exact: true })).toHaveCount(0);
  expect(writes).toBe(0);
});

test('expired pairing and corrupt configuration/journal expose recovery without replacement', async ({ page, launcher }, testInfo) => {
  test.setTimeout(90000);
  const expiredUrl = await launcher.start(); await launcher.expire();
  await page.goto(expiredUrl);
  await expect(page.getByText('This link expired or was already used.', { exact: false })).toBeVisible();
  const pairUrl = await launcher.start();
  await page.goto(pairUrl);
  await expect(page.getByRole('heading', { name: 'Create your first publication' })).toBeVisible();
  await page.getByLabel('Publication name', { exact: true }).fill('Retained publication');
  await page.getByRole('button', { name: 'Create publication', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/publications\//);
  const configPath = join(launcher.root, 'private', 'workspace.json');
  const configuration = await readFile(configPath, 'utf8');
  const config = JSON.parse(configuration);
  await writeFile(join(config.privateDirectory, 'operations.json'), '{damaged');
  await page.goto(`${launcher.origin}/kessel-run`);
  await expect(page.getByRole('heading', { name: 'Your workspace needs attention' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create publication', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('entry-error.png'), fullPage: true });
  await launcher.stop(); await writeFile(configPath, '{damaged');
  const recoveryUrl = await launcher.start();
  await page.goto(recoveryUrl);
  await expect(page.getByRole('heading', { name: 'Your workspace needs attention' })).toBeVisible();
  expect(await readFile(configPath, 'utf8')).toBe('{damaged');
  expect(await readdir(join(config.root, 'Publications'))).toHaveLength(1);
});
