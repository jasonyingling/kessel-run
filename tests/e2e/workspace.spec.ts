import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('no-key manual publication, import, independent outputs, save and export', async ({ page, context }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addCookies([{ name: 'kr-local-session', value: process.env.KR_E2E_SESSION!, url: 'http://127.0.0.1:3197', httpOnly: true, sameSite: 'Strict' }]);
  await page.goto('/kessel-run');
  await page.getByRole('button', { name: 'Choose folder' }).click();
  await page.getByLabel('Title', { exact: true }).fill(`Synthetic ${testInfo.project.name}`);
  await page.getByLabel('Empty folder path').fill(join(process.env.KR_E2E_ROOT!, testInfo.project.name));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'New publication' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic publication');
  await page.getByLabel('Purpose or brief').fill('A supplied synthetic audience');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Synthetic publication' }).click();
  await page.getByRole('button', { name: 'Import voice / author' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic voice');
  const profile = await readFile('tests/fixtures/kessel-run/voice.md', 'utf8');
  await page.getByLabel('Exact profile prose').fill(profile);
  await page.getByLabel('Attribution / provenance').fill('Synthetic fixture, explicitly confirmed for test');
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByText('Added metadata preview')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm use of this profile' }).click();
  await page.getByRole('button', { name: 'New piece' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic piece');
  await page.getByLabel('Purpose or brief').fill('Review supplied workshop notes.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Synthetic piece' }).click();
  for (const name of ['Article output', 'Short output']) {
    await page.getByRole('button', { name: 'Add output' }).click();
    await page.getByLabel('Title', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  }
  await page.getByRole('link', { name: 'Article output' }).click();
  await page.getByLabel('Output prose').fill('Human-supplied synthetic draft.');
  await page.getByRole('button', { name: 'Save prose' }).click();
  await page.reload();
  await expect(page.getByLabel('Output prose')).toHaveValue('Human-supplied synthetic draft.');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  await expect(page.getByRole('link', { name: 'Short output' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
