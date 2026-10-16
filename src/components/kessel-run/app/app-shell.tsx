'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Feather, Layers, Menu, Plus, Settings, AudioLines, X } from 'lucide-react';
import type { WorkspaceAvailability, WorkspaceOverview } from '@/lib/kessel-run/app-contracts';
import { localApi } from '@/lib/kessel-run/local-api';
import { pairFromLauncher } from './pairing';
import { AppButton } from './app-button';

const NavigationContext = createContext<(overview: WorkspaceOverview) => void>(() => {});
export function useWorkspaceNavigation(overview: WorkspaceOverview | null) {
  const update = useContext(NavigationContext);
  useEffect(() => { if (overview) update(overview); }, [overview, update]);
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Legacy projects retain their existing shell and layout contract.
  if (pathname.startsWith('/kessel-run/projects/')) return children;
  return <EditorialShell pathname={pathname}>{children}</EditorialShell>;
}
function EditorialShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void pairFromLauncher().then(() => localApi<WorkspaceAvailability>('bootstrap', undefined, controller.signal)).then(async available => {
      if (available.status !== 'ready') { if (active) setOverview(null); return; }
      const next = await localApi<WorkspaceOverview>('workspace', undefined, controller.signal);
      if (active) setOverview(next);
    }).catch(() => { if (active) setOverview(null); });
    return () => { active = false; controller.abort(); };
  }, [pathname]);
  const selectedOutput = overview?.outputs.find(value => pathname === `/kessel-run/outputs/${value.id}`);
  const selectedPiece = overview?.pieces.find(value => pathname === `/kessel-run/pieces/${value.id}` || value.id === selectedOutput?.pieceId);
  const publicationId = selectedPiece?.publicationId;
  function close(returnFocus = false) { setExpanded(false); if (returnFocus) toggle.current?.focus(); }
  return <NavigationContext.Provider value={setOverview}><div className="kr-app">
    <a className="kr-skip" href="#writing-content">Skip to content</a>
    <aside className="kr-sidebar" onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); close(true); } }}>
      <div className="kr-brand-row"><Link href="/kessel-run" className="kr-brand" onClick={() => close()}><Feather size={24} aria-hidden="true" />Kessel Run</Link><AppButton ref={toggle} static className="kr-menu-toggle" aria-expanded={expanded} aria-controls="workspace-navigation" onClick={() => setExpanded(value => !value)}>{expanded ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}<span>{expanded ? 'Close menu' : 'Open menu'}</span></AppButton></div>
      <div className="kr-navigation" id="workspace-navigation" data-expanded={expanded}>
        <p className="kr-workspace-name">{String(overview?.workspace.title ?? 'Your editorial workspace')}</p>
        <nav aria-label="Workspace" onClick={event => { if ((event.target as Element).closest('a')) close(); }}>
          <Link href="/kessel-run" aria-current={pathname === '/kessel-run' ? 'page' : undefined}><BookOpen size={20} strokeWidth={1.5} aria-hidden="true" />Overview</Link>
          <Link href="/kessel-run/content" aria-current={pathname === '/kessel-run/content' ? 'page' : undefined}><Layers size={20} strokeWidth={1.5} aria-hidden="true" />All content</Link>
          <Link href="/kessel-run/voices" aria-current={pathname === '/kessel-run/voices' ? 'page' : undefined}><AudioLines size={20} strokeWidth={1.5} aria-hidden="true" />Voice studio</Link>
          <span className="kr-eyebrow kr-nav-label">Your publications</span>
          {overview?.publications.map(value => <Link key={String(value.id)} href={`/kessel-run/publications/${value.id}`} aria-current={pathname === `/kessel-run/publications/${value.id}` ? 'page' : undefined} data-parent-current={value.id === publicationId || undefined}><span className="kr-publication-dot" aria-hidden="true" />{String(value.title)}</Link>)}
          <Link href="/kessel-run?create=publication"><Plus size={20} strokeWidth={1.5} aria-hidden="true" />New publication</Link>
          <Link href="/kessel-run/settings" aria-current={pathname === '/kessel-run/settings' ? 'page' : undefined}><Settings size={20} strokeWidth={1.5} aria-hidden="true" />Settings</Link>
        </nav>
        <p className="kr-sidebar-bottom">Local first<br />Your words, your workspace</p>
      </div>
    </aside>
    <main id="writing-content" className="kr-main" tabIndex={-1}>{children}</main>
  </div></NavigationContext.Provider>;
}
