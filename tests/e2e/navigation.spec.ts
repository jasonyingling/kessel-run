import { test, expect } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { OutputContext, WorkspaceOverview } from '../../src/lib/kessel-run/app-contracts';

test('editorial navigation, URL filters, exact progress and recovery across destinations', async ({ page, context }, testInfo) => {
  test.setTimeout(90000);
  const origin = 'http://127.0.0.1:3197';
  const errors: string[] = []; const inference: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && /\/local\/(writing|cleanup|connection-test)/.test(request.url())) inference.push(request.url()); });
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'workspace.json'), { force: true });
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'selection.json'), { force: true });
  await context.addCookies([{ name: 'kr-local-session', value: process.env.KR_E2E_SESSION!, url: origin, httpOnly: true, sameSite: 'Strict' }]);
  const headers = { origin, 'x-kr-csrf': 'local' };
  const selected = await context.request.post('/api/kessel-run/local/workspace', { headers, data: { operationId: crypto.randomUUID(), root: join(process.env.KR_E2E_ROOT!, 'navigation-' + testInfo.project.name), title: 'Synthetic editorial workspace' } });
  expect(selected.ok()).toBe(true);
  const overview = async (): Promise<WorkspaceOverview> => (await context.request.get('/api/kessel-run/local/workspace')).json();
  const initial = await overview();
  async function command<T>(action: string, input: Record<string, unknown>): Promise<T> {
    const response = await context.request.post('/api/kessel-run/local/content', { headers: { ...headers, 'x-kr-workspace-ref': String(initial.workspace.id) }, data: { action, input } });
    expect(response.ok(), await response.text()).toBe(true); return response.json();
  }
  let releaseLoading!: () => void;
  const loading = new Promise<void>(resolve => { releaseLoading = resolve; });
  await page.route('**/api/kessel-run/local/bootstrap', async route => { await loading; await route.continue(); });
  await page.goto('/kessel-run');
  await expect(page.locator('main [aria-busy="true"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('loading.png'), fullPage: true });
  releaseLoading();
  await expect(page.getByRole('button', { name: 'New publication' })).toBeVisible();
  await page.unroute('**/api/kessel-run/local/bootstrap');
  await page.screenshot({ path: testInfo.outputPath('overview-empty.png'), fullPage: true });
  const alpha = await command<{ id: string }>('publication', { operationId: crypto.randomUUID(), expectedHash: (await overview()).workspace.hash, title: 'Field Notes', purpose: 'Observations from ordinary work.', presets: ['Article', 'Short post'] });
  const beta = await command<{ id: string }>('publication', { operationId: crypto.randomUUID(), expectedHash: (await overview()).workspace.hash, title: 'Weekend Review', purpose: 'Independent reviews.', presets: ['Review'] });
  const voiceInput = { publicationId: alpha.id, prose: 'Use concrete examples. Mark unsupported claims.', scope: 'publication', parent: null, authorId: null };
  const preview = await command<{ publicationHash: string }>('profile-preview', voiceInput);
  const voice = await command<{ id: string; version: number }>('profile-import', { ...voiceInput, operationId: crypto.randomUUID(), expectedHash: preview.publicationHash, title: 'Field Notes voice', provenance: 'Synthetic test fixture, explicitly confirmed.' });
  const piece = await command<{ id: string }>('piece', { operationId: crypto.randomUUID(), expectedHash: (await overview()).publications.find(value => value.id === alpha.id)!.hash, publicationId: alpha.id, title: 'A week with the controls', brief: 'Supplied observations.', mode: 'guided' });
  await command('piece', { operationId: crypto.randomUUID(), expectedHash: (await overview()).publications.find(value => value.id === beta.id)!.hash, publicationId: beta.id, title: 'A new idea', brief: '', mode: 'guided' });
  const current = await overview();
  const outputIds: string[] = [];
  for (const title of ['Article draft', 'Short post draft']) {
    const preset = current.presets.find(value => value.publicationId === alpha.id && value.format === (title === 'Article draft' ? 'Article' : 'Short post'))!;
    const created = await command<{ id: string }>('output', { operationId: crypto.randomUUID(), expectedHash: (await overview()).pieces.find(value => value.id === piece.id)!.hash, pieceId: piece.id, title, format: String(preset.format), preset: String(preset.id), voice: { profileId: voice.id, version: voice.version }, author: null }); outputIds.push(created.id);
  }
  let saved = await command<OutputContext>('context', { outputId: outputIds[0] });
  await command('editor', { operationId: crypto.randomUUID(), expectedHash: saved.output.hash, expectedContextHash: saved.contextHash, outputId: outputIds[0], prose: 'A supplied final observation.' });
  saved = await command<OutputContext>('context', { outputId: outputIds[0] });
  await command('final-accept', { operationId: crypto.randomUUID(), expectedHash: saved.output.hash, expectedContextHash: saved.contextHash, outputId: outputIds[0], revisionId: saved.output.currentRevision });
  await page.reload();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Publications', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /Field Notes Observations/ })).toBeVisible();
  expect(await page.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).toMatch(/geist/i);
  await page.screenshot({ path: testInfo.outputPath('overview-populated.png'), fullPage: true });
  const nav = page.getByRole('navigation', { name: 'Workspace', exact: true });
  async function navigate(name: string) {
    const menu = page.getByRole('button', { name: 'Open menu', exact: true });
    if (await menu.isVisible()) await menu.click();
    await nav.getByRole('link', { name, exact: true }).click();
  }
  if (testInfo.project.name !== 'desktop') {
    const menu = page.getByRole('button', { name: 'Open menu', exact: true });
    await menu.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox(); expect(heading!.y).toBeLessThan(200);
  }
  await navigate('New publication');
  await expect(page.getByLabel('Title', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/kessel-run`);
  await navigate('New publication');
  await page.getByLabel('Title', { exact: true }).fill('Third publication');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/publications\//);
  await navigate('New publication');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/kessel-run`);
  await navigate('All content');
  if (testInfo.project.name === 'desktop') await expect(nav.getByRole('link', { name: 'All content', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('region', { name: 'Ready', exact: true }).getByRole('link', { name: /Article draft/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Drafting', exact: true }).getByRole('link', { name: /Short post draft/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('content.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Publication', exact: true }).selectOption(beta.id);
  await expect(page).toHaveURL(new RegExp(`publication=${beta.id}`));
  await page.getByRole('combobox', { name: 'Output status', exact: true }).selectOption('accepted');
  await expect(page.getByRole('heading', { name: 'No matching content' })).toBeVisible();
  await page.goBack(); await expect(page.getByRole('combobox', { name: 'Output status', exact: true })).toHaveValue('all');
  await page.goForward(); await expect(page.getByRole('combobox', { name: 'Output status', exact: true })).toHaveValue('accepted');
  await page.getByRole('link', { name: 'Reset filters', exact: true }).first().click();
  await navigate('Field Notes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Field Notes');
  await expect(page.getByRole('heading', { name: 'AI writing', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('publication.png'), fullPage: true });
  await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Publication voice', exact: true })).toHaveValue(alpha.id);
  await page.screenshot({ path: testInfo.outputPath('studio.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Publication voice', exact: true }).selectOption(beta.id);
  await expect(page).toHaveURL(new RegExp(`publication=${beta.id}`));
  await page.goBack(); await expect(page.getByRole('combobox', { name: 'Publication voice', exact: true })).toHaveValue(alpha.id);
  await navigate('Settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.getByRole('heading', { name: 'AI connection (optional)', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
  for (const route of ['publications', 'pieces', 'outputs']) {
    await page.goto(`/kessel-run/${route}/00000000-0000-4000-8000-000000000000`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('unavailable');
  }
  await page.goto('/kessel-run/voices?publication=missing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('unavailable');
  await page.goto(`/kessel-run/outputs/${outputIds[1]}`);
  await page.getByLabel('Output prose').fill('Unsent local prose survives navigation.');
  await navigate('All content');
  await expect(page.getByText('Save or reconcile your edits before leaving this desk.', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.goto('/kessel-run/content');
  await page.getByRole('link', { name: /Short post draft/ }).click();
  await expect(page.getByLabel('Output prose')).toHaveValue('Unsent local prose survives navigation.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(inference).toEqual([]); expect(errors).toEqual([]);
});
