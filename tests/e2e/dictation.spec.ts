import { test, expect } from '@playwright/test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

test('inline dictation, typing, freeze, cleanup undo and source failures', async ({ page, context }, testInfo) => {
  const errors: string[] = [];
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'workspace.json'), { force: true });
  await rm(join(process.env.KR_E2E_ROOT!, 'private', 'selection.json'), { force: true });
  page.on('pageerror', error => errors.push(error.message));
  await context.addCookies([{ name: 'kr-local-session', value: process.env.KR_E2E_SESSION!, url: 'http://127.0.0.1:3197', httpOnly: true, sameSite: 'Strict' }]);
  await page.route('**/api/kessel-run/local/models?source=*', route => route.fulfill({ json: { checked: true, message: 'Synthetic model access', models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', available: true }, { id: 'gpt-6-luna', label: 'GPT-6 Luna', available: true }] } }));
  await page.addInitScript(() => {
    class FakeRecognition {
      continuous = false; interimResults = false; lang = '';
      onstart: (() => void) | null = null; onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      start() { (window as unknown as { recognition: FakeRecognition }).recognition = this; this.onstart?.(); }
      stop() { this.onend?.(); } abort() {}
    }
    Object.assign(window, { SpeechRecognition: FakeRecognition });
  });
  const fixture = await context.request.post('/api/kessel-run/local/workspace', { headers: { origin: 'http://127.0.0.1:3197', 'x-kr-csrf': 'local' }, data: { operationId: crypto.randomUUID(), root: join(process.env.KR_E2E_ROOT!, 'dictation-' + testInfo.project.name), title: `Synthetic ${testInfo.project.name}` } });
  expect(fixture.ok()).toBe(true);
  await page.goto('/kessel-run');
  await page.getByRole('button', { name: 'New publication' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic publication');
  await page.getByLabel('Purpose or brief').fill('A supplied synthetic audience');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/publications\//);
  await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await page.getByRole('button', { name: 'Import an existing profile' }).click();
  await page.getByLabel('Profile title', { exact: true }).fill('Synthetic voice');
  const profile = await readFile('tests/fixtures/kessel-run/voice.md', 'utf8');
  await page.getByLabel('Exact profile prose').fill(profile);
  await page.getByLabel('Profile provenance').fill('Synthetic fixture, explicitly confirmed for test');
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByText('Confirm these exact words')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm use of this profile' }).click();
  await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to publication', exact: true }).click();
  await page.getByRole('button', { name: 'New piece' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic piece');
  await page.getByLabel('Purpose or brief').fill('Review supplied workshop notes.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/pieces\//);
  const pieceUrl = page.url();
  for (const name of ['Article output', 'Short output']) {
    await page.getByRole('button', { name: 'Add output / repurpose' }).click();
    await page.getByLabel('Title', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/outputs\//);
    await page.goto(pieceUrl);
  }
  await page.getByRole('link', { name: 'Article output' }).click();
  await expect(page).toHaveURL(/\/outputs\//);
  await expect(page.getByRole('heading', { name: 'AI writing', exact: true })).toBeVisible();
  const composer = page.locator('.kr-composer');
  const message = page.getByRole('textbox', { name: 'Message', exact: true });
  await message.fill('Typed notes');
  await composer.getByRole('button', { name: 'Dictate', exact: true }).click();
  await message.focus();
  await message.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(2, 2));
  await page.evaluate(() => {
    const recognition = (window as unknown as { recognition: { onresult: (event: unknown) => void } }).recognition;
    recognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'spoken words' } }] });
  });
  await expect(message).toHaveValue('Typed notes spoken words');
  expect(await message.evaluate((element: HTMLTextAreaElement) => element.selectionStart)).toBe(2);
  await page.keyboard.type('X');
  await expect(message).toHaveValue('TyXped notes spoken words');
  await composer.getByRole('button', { name: 'Stop dictation', exact: true }).click();
  await composer.getByRole('button', { name: 'Clean up', exact: true }).click();
  await expect(message).toHaveValue('Synthetic cleaned fixture text.');
  await composer.getByRole('button', { name: 'Undo cleanup', exact: true }).click();
  await expect(message).toHaveValue('TyXped notes spoken words');
  await composer.getByRole('button', { name: 'Dictate', exact: true }).click();
  await page.getByRole('button', { name: 'Send billed AI turn' }).click();
  await page.evaluate(() => {
    const recognition = (window as unknown as { recognition: { onresult: (event: unknown) => void } }).recognition;
    recognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'late must not enter draft' } }] });
  });
  await message.fill('Newer draft survives');
  await expect(message).toHaveValue('Newer draft survives');
  await expect(page.getByText('Synthetic fixture candidate from supplied workshop notes.', { exact: false }).first()).toBeVisible();
  await expect(message).toHaveValue('Newer draft survives');
  await page.route('**/api/kessel-run/local/writing', route => route.request().method() === 'POST' ? route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: JSON.stringify({ sequence: 0, type: 'terminal', status: 'failed' }) + '\n' }) : route.continue());
  await message.fill('Original survives failed terminal');
  await page.getByRole('button', { name: 'Send billed AI turn' }).click();
  await expect(message).toHaveValue('Original survives failed terminal');
  await page.goto(pieceUrl);
  await page.getByRole('button', { name: 'Add notes / interview' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic dictated source');
  await page.getByLabel('Attribution / provenance').fill('Synthetic test writer');
  const notes = page.getByRole('textbox', { name: 'Supplied notes, including questions and answers', exact: true });
  await notes.fill('Typed source');
  const sourceComposer = page.locator('.kr-composer').first();
  await sourceComposer.getByRole('button', { name: 'Dictate', exact: true }).click();
  await page.evaluate(() => {
    const recognition = (window as unknown as { recognition: { onresult: (event: unknown) => void } }).recognition;
    recognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'raw source words' } }] });
  });
  let fail = true;
  await page.route('**/api/kessel-run/local/content', route => {
    if (route.request().postDataJSON()?.action === 'source' && fail) { fail = false; return route.fulfill({ status: 400, json: { error: 'Synthetic failure' } }); }
    return route.continue();
  });
  await sourceComposer.getByRole('button', { name: 'Save source', exact: true }).click();
  await expect(notes).toHaveValue('Typed source raw source words');
  await page.getByRole('button', { name: 'Retry saved submission', exact: true }).click();
  await expect(page.getByText('Synthetic dictated source', { exact: false })).toBeVisible();
  await page.getByText('Synthetic dictated source', { exact: false }).click();
  await expect(page.getByText('Raw recognition (may contain errors)', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
