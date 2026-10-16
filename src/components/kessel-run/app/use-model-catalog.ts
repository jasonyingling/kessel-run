'use client';
import { useCallback, useEffect, useState } from 'react';
import { modelChoices, type ModelCatalog } from '@/lib/kessel-run/models';

export function useModelCatalog(source: string, preferred = 'gpt-6.1-sol') {
  const [model, setModel] = useState(preferred);
  const [catalog, setCatalog] = useState<ModelCatalog & { source: string }>({ source: '', models: modelChoices.map(item => ({ ...item, available: null })), message: '', checked: false });
  const [version, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch(`/api/kessel-run/local/models?source=${encodeURIComponent(source)}`, { signal: controller.signal });
      if (!response.ok) throw Error('Model access could not be checked. Pair this browser and try again.');
      const result: ModelCatalog = await response.json();
      if (!controller.signal.aborted) setCatalog({ ...result, source });
    }
    void load().catch(() => { if (!controller.signal.aborted) setCatalog({ source, models: modelChoices.map(item => ({ ...item, available: false })), message: 'Model access could not be checked. Refresh the list or check Settings.', checked: false }); });
    return () => controller.abort();
  }, [source, version]);
  const refreshCatalog = useCallback(() => { setCatalog(previous => ({ ...previous, source: '' })); refresh(value => value + 1); }, []);
  const current = catalog.source === source;
  return { model, setModel, models: catalog.models, message: current ? catalog.message : 'Checking model access…', available: current && catalog.models.some(item => item.id === model && item.available === true), refresh: refreshCatalog };
}
