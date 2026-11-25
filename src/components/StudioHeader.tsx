import { Download } from 'lucide-react';
import { WorkspaceTab } from '../types/template';

interface StudioHeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onDownloadXml: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'preview', label: 'Live Preview' },
  { id: 'xml', label: 'XML Builder' },
  { id: 'schema', label: 'Schema & SEO' },
  { id: 'audit', label: 'SEO Audit' },
  { id: 'a11y', label: 'Accessibility Audit' },
  { id: 'perf', label: 'Performance' },
  { id: 'deploy', label: 'Deploy Guide' },
];

export function StudioHeader({
  activeTab,
  onSelectTab,
  onDownloadXml,
}: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-8 px-6 h-16">
        <button
          type="button"
          onClick={() => onSelectTab('preview')}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          EZIBLE Theme Studio
        </button>

        <nav
          aria-label="Workspace views"
          className="flex items-center gap-7 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onDownloadXml}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Download XML</span>
          </button>
        </div>
      </div>
    </header>
  );
}
