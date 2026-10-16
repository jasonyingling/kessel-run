import { readFile } from 'node:fs/promises';
import { test, expect } from './onboarding-fixture';
import type { WorkspaceOverview, OutputContext } from '../../src/lib/kessel-run/app-contracts';

test('real keyless studio, recoverable exact preferences, presets, author pins and export', async ({ page, context, launcher }, testInfo) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [], inference: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && /\/local\/(writing|cleanup|connection-test)/.test(request.url())) inference.push(request.url()); });
  await page.goto(await launcher.start());
  await page.getByLabel('Publication name', { exact: true }).fill('Studio Review');
  await page.getByRole('button', { name: 'Create publication', exact: true }).click();
  await expect(page).toHaveURL(/\/publications\//);
  const publicationUrl = page.url();
  const overview = async (): Promise<WorkspaceOverview> => (await context.request.get(`${launcher.origin}/api/kessel-run/local/workspace`)).json();
  const workspaceId = String((await overview()).workspace.id);
  const publicationId = String((await overview()).publications[0].id);
  async function command<T>(action: string, input: Record<string, unknown>): Promise<T> {
    const response = await context.request.post(`${launcher.origin}/api/kessel-run/local/content`, { headers: { origin: launcher.origin, 'x-kr-csrf': 'local', 'x-kr-workspace-ref': workspaceId }, data: { action, input } });
    expect(response.ok(), await response.text()).toBe(true); return response.json();
  }
  await page.getByRole('button', { name: 'New piece', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('My first idea');
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page).toHaveURL(/\/pieces\//); const pieceUrl = page.url();
  await page.getByRole('button', { name: 'Add output / repurpose' }).click();
  await expect(page.getByRole('heading', { name: 'Add an independent output' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create a starter voice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Voice studio', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write a starter voice', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Voice setup conversation' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('studio-empty.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Profile', exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await expect(page.getByRole('tab', { name: 'Authors', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.getByRole('heading', { name: 'Supplied evidence and provenance' })).toBeVisible();
  await page.keyboard.press('Home');
  await page.getByRole('button', { name: 'Write a starter voice', exact: true }).click();
  await page.getByLabel('Desired reader experience').fill('Leave with one useful observation.');
  await page.getByLabel('Other rules or preferences').fill('Use supplied facts.\nKeep my uncertainty visible.');
  await page.getByRole('link', { name: 'Back to publication', exact: true }).click();
  await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await expect(page.getByLabel('Other rules or preferences')).toHaveValue('Use supplied facts.\nKeep my uncertainty visible.');
  await page.getByRole('button', { name: 'Review exact preferences' }).click();
  const exact = '## Reader experience\n\nLeave with one useful observation.\n\n## Other preferences\n\nUse supplied facts.\nKeep my uncertainty visible.';
  await expect(page.getByLabel('Exact profile prose (Markdown)')).toHaveValue(exact);
  await page.getByRole('button', { name: 'Preview preferences' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm these exact words' })).toBeVisible();
  expect((await overview()).profiles).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('studio-preview.png'), fullPage: true });
  const importIds: string[] = []; let loseFirst = true;
  await page.route('**/api/kessel-run/local/content', async route => {
    const data = route.request().postDataJSON();
    if (data.action === 'profile-import') { importIds.push(data.input.operationId); if (loseFirst) { loseFirst = false; await route.fetch(); await route.abort('failed'); return; } }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Use these exact preferences' }).click();
  await expect(page.getByRole('button', { name: 'Retry voice submission' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('studio-uncertain-save.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Retry voice submission' }).click();
  await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await expect(page.getByText('Approval: approved · Evidence maturity: sparse')).toBeVisible();
  expect(importIds).toHaveLength(2); expect(importIds[0]).toBe(importIds[1]);
  await page.unroute('**/api/kessel-run/local/content');
  let state = await overview(); expect(state.profiles).toHaveLength(1); const originalVoice = state.profiles[0];
  expect(originalVoice.body).toBe(exact);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected profile' }).click();
  const download = await downloadPromise; const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.prose).toBe(exact); expect(exported.metadata).toMatchObject({ status: 'approved', evidenceLevel: 'sparse', parent: null }); expect(exported.files).toBeUndefined();
  await page.screenshot({ path: testInfo.outputPath('studio-approved.png'), fullPage: true });
  await page.goto(publicationUrl);
  await page.getByRole('button', { name: 'Format presets', exact: true }).click();
  await page.getByLabel('Preset display name').fill('Weekend review'); await page.getByLabel('Actual output format').fill('Review');
  await page.getByLabel('Format instructions (optional)').fill('A concise verdict.');
  await page.getByRole('button', { name: 'Add preset', exact: true }).click();
  await expect(page.getByLabel('Preset display name')).toHaveValue('');
  const reviewPreset = (await overview()).presets.find(value => value.title === 'Weekend review')!;
  await page.goto(pieceUrl);
  await page.getByRole('button', { name: 'Add output / repurpose' }).click();
  await page.getByRole('combobox', { name: 'Exact publication voice', exact: true }).selectOption(`${originalVoice.id}:1`);
  await page.getByLabel('Title', { exact: true }).fill('First review'); await page.getByRole('combobox', { name: 'Format preset', exact: true }).selectOption(String(reviewPreset.id));
  await page.getByRole('button', { name: 'Create and write', exact: true }).click();
  await expect(page).toHaveURL(/\/outputs\//); const outputUrl = page.url(); const originalOutput = (await overview()).outputs[0];
  await page.getByLabel('Output prose').fill('I noticed the controls after a week.'); await page.getByRole('button', { name: 'Save prose' }).click();
  await expect(page.locator('.kr-main > .kr-status')).toHaveText('Saved.');
  await page.goto(publicationUrl); await page.getByRole('button', { name: 'Format presets', exact: true }).click();
  await page.getByLabel('Preset to edit').selectOption(String(reviewPreset.id));
  await page.getByLabel('Actual output format').fill('Newsletter');
  const presetBefore = (await overview()).presets.find(value => value.id === reviewPreset.id)!;
  await command('preset-update', { operationId: crypto.randomUUID(), expectedHash: presetBefore.hash, presetId: reviewPreset.id, title: 'Updated elsewhere', instructions: 'External instructions' });
  await expect(page.getByLabel('Preset to edit').locator('option:checked')).toContainText('Updated elsewhere');
  await page.getByRole('button', { name: 'Save preset changes' }).click();
  await expect(page.getByText('Saved Markdown changed.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Actual output format')).toHaveValue('Newsletter');
  expect((await overview()).presets.find(value => value.id === reviewPreset.id)?.body).toBe('External instructions');
  await page.getByRole('button', { name: 'Edit rejected preset submission' }).click();
  await page.getByRole('button', { name: 'Reload selected preset' }).click();
  await page.getByLabel('Preset display name').fill('Weekend review');
  await page.getByLabel('Actual output format').fill('Newsletter'); await page.getByRole('button', { name: 'Save preset changes' }).click();
  await expect(page.getByLabel('Preset display name')).toHaveValue('');
  await page.getByLabel('Preset display name').fill('Weekend review'); await page.getByRole('button', { name: 'Add preset', exact: true }).click();
  await expect(page.getByText('Choose a unique preset name in this publication.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('preset-rejected.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit rejected preset submission' }).click();
  await page.getByLabel('Preset display name').fill('Another format');
  await page.getByRole('button', { name: 'Add preset', exact: true }).click(); await expect(page.getByLabel('Preset display name')).toHaveValue('');
  await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await page.getByRole('tab', { name: 'Authors', exact: true }).click(); await page.getByRole('button', { name: 'Add author overlay' }).click();
  await page.getByLabel('Profile title').fill('Pat'); await page.getByLabel('Exact profile prose (Markdown)').fill('Use my firsthand observations.'); await page.getByLabel('Profile provenance').fill('Supplied author preferences.');
  await page.getByRole('button', { name: 'Preview import' }).click(); await page.getByRole('button', { name: 'Confirm use of this profile' }).click(); await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Import an existing profile' }).click();
  await page.getByLabel('Exact profile prose (Markdown)').fill('Imported exact starter voice.\n\n' + 'Keep this supplied rule. '.repeat(70)); await page.getByLabel('Profile provenance').fill('Existing user profile.');
  await page.getByRole('button', { name: 'Preview import' }).click(); await page.getByRole('button', { name: 'Confirm use of this profile' }).click(); await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('studio-long-profile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Propose changes to this version' }).click();
  await page.getByRole('textbox', { name: 'Proposed rules', exact: true }).fill('Second approved version, explicitly reviewed.');
  await page.getByLabel('Why these changes / supplied evidence').fill('My requested preference revision.');
  await page.getByRole('button', { name: 'Propose new profile version' }).click();
  await page.getByText(/History and proposals/).click();
  await expect(page.getByRole('heading', { name: 'Previously approved rules' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve these exact rules' }).click();
  await expect.poll(async () => ((await overview()).publications.find(value => value.id === publicationId)!.defaultVoice as { version: number }).version).toBe(3);
  state = await overview(); const author = state.profiles.find(value => value.scope === 'author')!; const newVoice = state.publications[0].defaultVoice as { profileId: string; version: number };
  expect(state.profiles.find(value => value.id === newVoice.profileId && value.version === 2)).toMatchObject({ status: 'draft', body: 'Second approved version, explicitly reviewed.' });
  expect(state.profiles.find(value => value.id === newVoice.profileId && value.version === 3)).toMatchObject({ status: 'approved', body: 'Second approved version, explicitly reviewed.' });
  const rejected = await context.request.post(`${launcher.origin}/api/kessel-run/local/content`, { headers: { origin: launcher.origin, 'x-kr-csrf': 'local', 'x-kr-workspace-ref': workspaceId }, data: { action: 'output', input: { operationId: crypto.randomUUID(), expectedHash: state.pieces[0].hash, pieceId: state.pieces[0].id, title: 'Mismatch', preset: reviewPreset.id, format: 'Newsletter', voice: newVoice, author: { profileId: author.id, version: author.version } } } });
  expect((await rejected.json()).code).toBe('MISSING_PROFILE_VERSION');
  await page.goto(pieceUrl); await page.getByRole('button', { name: 'Add output / repurpose' }).click();
  await expect(page.getByRole('combobox', { name: 'Author overlay', exact: true }).locator('option')).toHaveCount(1);
  await page.getByLabel('Title', { exact: true }).fill('Newsletter'); await page.getByRole('combobox', { name: 'Format preset', exact: true }).selectOption(String(reviewPreset.id)); await page.getByRole('button', { name: 'Create and write', exact: true }).click(); await expect(page).toHaveURL(/\/outputs\//);
  state = await overview(); expect(state.outputs.find(value => value.title === 'Newsletter')?.format).toBe('Newsletter');
  const original = await command<OutputContext>('context', { outputId: originalOutput.id });
  expect(original.output.format).toBe('Review'); expect(original.output.voice).toEqual({ profileId: originalVoice.id, version: 1 }); expect(original.output.body).toBe('I noticed the controls after a week.');
  await page.goto(outputUrl); await expect(page.getByLabel('Output prose')).toHaveValue('I noticed the controls after a week.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(`${launcher.origin}/kessel-run/voices?publication=${publicationId}`);
  await expect(page.getByRole('heading', { name: 'Voice setup conversation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Get AI help', exact: true }).click();
  await page.getByText('Assistant settings', { exact: true }).click();
  await expect(page.getByText('No key is configured for this source. Add a key or select the configured source.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Supplied request, not sent.');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Get AI help', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Voice setup conversation' })).toHaveCount(0);
  expect(inference).toEqual([]); expect(errors).toEqual([]);
});

test('late preview and import completions cannot erase a remounted studio draft or its newer command', async ({ page, launcher }) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    const original = window.fetch;
    Object.assign(window, { studioReads: { preview: 0, imports: 0 } });
    window.fetch = async (input, init) => {
      let action = ''; try { action = JSON.parse(String(init?.body ?? '{}')).action; } catch { /* Other fetches retain native behavior. */ }
      // Simulate a transport that delivers a response despite preview cancellation.
      const response = await original(input, action === 'profile-preview' ? { ...init, signal: undefined } : init);
      if (action === 'profile-preview' || action === 'profile-import') {
        const json = response.json.bind(response);
        response.json = async () => { const value = await json(); const reads = (window as unknown as { studioReads: { preview: number; imports: number } }).studioReads; queueMicrotask(() => { if (action === 'profile-preview') reads.preview++; else reads.imports++; }); return value; };
      }
      return response;
    };
  });
  await page.goto(await launcher.start());
  await page.getByLabel('Publication name', { exact: true }).fill('Lifetime fixture');
  await page.getByRole('button', { name: 'Create publication', exact: true }).click();
  await expect(page).toHaveURL(/\/publications\//);
  await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await page.getByRole('button', { name: 'Import an existing profile' }).click();
  await page.getByLabel('Exact profile prose (Markdown)').fill('Older preview text'); await page.getByLabel('Profile provenance').fill('Explicit fixture');
  let releasePreview!: () => void, releaseOldImport!: () => void, releaseNewImport!: () => void;
  const previewHold = new Promise<void>(resolve => { releasePreview = resolve; });
  const oldImportHold = new Promise<void>(resolve => { releaseOldImport = resolve; });
  const newImportHold = new Promise<void>(resolve => { releaseNewImport = resolve; });
  let previewHeld = false, holdPreview = true, imports = 0, oldImportHeld = false, newImportHeld = false;
  await page.route('**/api/kessel-run/local/content', async route => {
    const request = route.request().postDataJSON();
    if (request.action === 'profile-preview' && holdPreview) {
      holdPreview = false; const response = await route.fetch(); previewHeld = true; await previewHold; await route.fulfill({ response }).catch(() => {}); return;
    }
    if (request.action === 'profile-import') {
      imports++;
      if (imports === 1) { const response = await route.fetch(); oldImportHeld = true; await oldImportHold; await route.fulfill({ response }); return; }
      if (imports === 3) { const response = await route.fetch(); newImportHeld = true; await newImportHold; await route.fulfill({ response }); return; }
    }
    await route.continue();
  });
  const readCounts = () => page.evaluate(() => (window as unknown as { studioReads: { preview: number; imports: number } }).studioReads);
  await page.getByRole('button', { name: 'Preview import' }).click(); await expect.poll(() => previewHeld).toBe(true);
  await page.getByRole('link', { name: 'Back to publication', exact: true }).click(); await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await page.getByLabel('Exact profile prose (Markdown)').fill('Newer recovered preview text');
  releasePreview(); await expect.poll(async () => (await readCounts()).preview).toBe(1);
  await expect(page.getByLabel('Exact profile prose (Markdown)')).toHaveValue('Newer recovered preview text');
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('kr-studio-draft:')).map(key => JSON.parse(sessionStorage.getItem(key)!).prose))).toEqual(['Newer recovered preview text']);
  await expect(page.getByRole('button', { name: 'Confirm use of this profile' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview import' }).click(); await page.getByRole('button', { name: 'Confirm use of this profile' }).click(); await expect.poll(() => oldImportHeld).toBe(true);
  await page.getByRole('link', { name: 'Back to publication', exact: true }).click(); await page.getByRole('link', { name: 'Manage voice', exact: true }).click();
  await page.getByRole('button', { name: 'Retry voice submission' }).click(); await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Import an existing profile' }).click(); await page.getByLabel('Exact profile prose (Markdown)').fill('New command and draft B'); await page.getByLabel('Profile provenance').fill('Second explicit fixture');
  await page.getByRole('button', { name: 'Preview import' }).click(); await page.getByRole('button', { name: 'Confirm use of this profile' }).click(); await expect.poll(() => newImportHeld).toBe(true);
  const pendingBefore = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.includes(':voice-studio:')).map(key => sessionStorage.getItem(key)));
  releaseOldImport(); await expect.poll(async () => (await readCounts()).imports).toBe(2);
  await expect(page.getByLabel('Exact profile prose (Markdown)')).toHaveValue('New command and draft B');
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.includes(':voice-studio:')).map(key => sessionStorage.getItem(key)))).toEqual(pendingBefore);
  releaseNewImport(); await expect(page.getByRole('group', { name: 'Voice draft' })).toHaveCount(0);
  await page.unroute('**/api/kessel-run/local/content');
});
