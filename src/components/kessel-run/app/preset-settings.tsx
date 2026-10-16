'use client';
import { useState } from 'react';
import type { Entity } from '@/lib/kessel-run/app-contracts';
import { AppButton } from './app-button';
import { Field } from './field';
import { useStudioCommand } from './studio-command';
export function PresetSettings({ publication, presets, workspaceId, blocked, onChanged }: { publication: Entity; presets: Entity[]; workspaceId: string; blocked: boolean; onChanged: () => Promise<void> }) {
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('Article');
  const [instructions, setInstructions] = useState('');
  const [baseHash, setBaseHash] = useState<string | null>(null);
  const command = useStudioCommand(`${workspaceId}:presets:${publication.id}`, onChanged);
  const preset = presets.find(value => value.id === selected);
  function choose(id: string) { const item = presets.find(value => value.id === id); setSelected(id); setBaseHash(item?.hash ?? null); setTitle(String(item?.title ?? '')); setFormat(String(item?.format ?? 'Article')); setInstructions(item?.body ?? ''); }
  return <section className="kr-panel kr-form" aria-label="Format presets"><h2>Format presets</h2><p>A display name helps you find a preset. Its format describes the output. Edits affect future selections and current instructions; existing outputs keep their saved format and voice versions.</p>
    {command.pending && <section><h3>Resolve your pending preset save</h3><AppButton disabled={command.busy || blocked} onClick={() => void command.run()}>Retry preset submission</AppButton>{command.pending.failed && <AppButton static onClick={command.abandon}>Edit rejected preset submission</AppButton>}</section>}
    <fieldset className="kr-form" disabled={blocked || command.busy || Boolean(command.pending) || !command.ready}>
      <Field label="Preset to edit"><select value={selected} onChange={event => choose(event.target.value)}><option value="">Add a preset</option>{presets.map(value => <option key={String(value.id)} value={String(value.id)}>{String(value.title)} · {String(value.format)}</option>)}</select></Field>
      <AppButton static disabled={!preset} onClick={() => choose(selected)}>Reload selected preset</AppButton><Field label="Preset display name"><input maxLength={80} value={title} onChange={event => setTitle(event.target.value)} /></Field>
      <Field label="Actual output format"><input list="format-suggestions" maxLength={80} value={format} onChange={event => setFormat(event.target.value)} /></Field><datalist id="format-suggestions">{['Article', 'Newsletter', 'Review', 'Social post', 'Video script'].map(value => <option key={value} value={value} />)}</datalist>
      <Field label="Format instructions (optional)"><textarea rows={5} maxLength={80000} value={instructions} onChange={event => setInstructions(event.target.value)} /></Field>
      <AppButton disabled={!title.trim() || !format.trim()} onClick={() => void command.run(preset ? 'preset-update' : 'preset-create', { ...(preset ? { presetId: preset.id, expectedHash: baseHash } : { publicationId: publication.id, expectedHash: publication.hash }), title, format, instructions }, () => choose(''))}>{preset ? 'Save preset changes' : 'Add preset'}</AppButton>
    </fieldset><p role="status">{command.message}</p>
  </section>;
}
