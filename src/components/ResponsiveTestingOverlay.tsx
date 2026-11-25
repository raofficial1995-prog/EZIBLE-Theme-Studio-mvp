import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Columns3,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { DeviceProfileKey, DeviceWidgetProfile } from '../types/template';

export interface BreakpointSpec {
  id: DeviceProfileKey;
  label: string;
  shortLabel: string;
  targetWidthPx: number;
  mediaQuery: string;
  rangeLabel: string;
}

export const BREAKPOINT_SPECS: Record<DeviceProfileKey, BreakpointSpec> = {
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    shortLabel: 'SM',
    targetWidthPx: 390,
    mediaQuery: '@media (max-width: 640px)',
    rangeLabel: '≤ 640px',
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    shortLabel: 'MD',
    targetWidthPx: 820,
    mediaQuery: '@media (min-width: 641px) and (max-width: 1024px)',
    rangeLabel: '641px – 1024px',
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    shortLabel: 'LG',
    targetWidthPx: 1240,
    mediaQuery: '@media (min-width: 1025px)',
    rangeLabel: '≥ 1025px',
  },
};

export const BREAKPOINT_ORDER: DeviceProfileKey[] = [
  'mobile',
  'tablet',
  'desktop',
];

export function resolveBreakpointFromWidth(widthPx: number): DeviceProfileKey {
  if (widthPx <= 640) return 'mobile';
  if (widthPx <= 1024) return 'tablet';
  return 'desktop';
}

interface ResponsiveTestingOverlayProps {
  viewport: DeviceProfileKey;
  measuredWidthPx: number;
  activeProfile: DeviceWidgetProfile;
  showColumnGuides: boolean;
  onSelectViewport: (device: DeviceProfileKey) => void;
  onToggleColumnGuides: () => void;
  onClose: () => void;
}

export function ResponsiveTestingOverlay({
  viewport,
  measuredWidthPx,
  activeProfile,
  showColumnGuides,
  onSelectViewport,
  onToggleColumnGuides,
  onClose,
}: ResponsiveTestingOverlayProps) {
  const [minimized, setMinimized] = useState(false);

  const selectedSpec = BREAKPOINT_SPECS[viewport];
  const effectiveWidth = measuredWidthPx > 0 ? measuredWidthPx : selectedSpec.targetWidthPx;
  const effectiveBreakpoint = resolveBreakpointFromWidth(effectiveWidth);
  const isConstrainedByWindow =
    measuredWidthPx > 0 && effectiveBreakpoint !== viewport;

  const deviceButtons: Array<{
    id: DeviceProfileKey;
    label: string;
    widthLabel: string;
    icon: typeof Smartphone;
  }> = [
    { id: 'mobile', label: 'Mobile', widthLabel: '390px', icon: Smartphone },
    { id: 'tablet', label: 'Tablet', widthLabel: '820px', icon: Tablet },
    { id: 'desktop', label: 'Desktop', widthLabel: '1240px', icon: Monitor },
  ];

  return (
    <aside
      aria-label="Responsive Testing overlay"
      className="fixed bottom-4 right-4 z-40 w-[332px] max-w-[calc(100vw-2rem)] rounded-lg bg-slate-950/95 text-slate-100 border border-slate-700/80 shadow-xl backdrop-blur-md"
    >
      {/* Header Row */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800/90">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-white tracking-tight whitespace-nowrap shrink-0">
            Responsive Testing
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-xs font-mono font-medium text-sky-300 tabular-nums whitespace-nowrap shrink-0">
            {selectedSpec.label} ({effectiveWidth}px)
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            aria-expanded={!minimized}
            aria-label={
              minimized
                ? 'Expand responsive testing overlay'
                : 'Minimize responsive testing overlay'
            }
            title={minimized ? 'Expand overlay' : 'Minimize overlay'}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {minimized ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide responsive testing overlay"
            title="Hide overlay"
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Quick Breakpoint Switcher (Always accessible, even when minimized) */}
      <div className="p-3 space-y-3">
        <div
          role="group"
          aria-label="Quick CSS breakpoint toggle"
          className="grid grid-cols-3 gap-1 p-1 rounded-md bg-slate-900 border border-slate-800"
        >
          {deviceButtons.map(({ id, label, widthLabel, icon: Icon }) => {
            const active = viewport === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectViewport(id)}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400 ${
                  active
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title={`Switch to ${label} breakpoint (${widthLabel})`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed Breakpoint Telemetry & Grid Guide Control */}
        {!minimized && (
          <div className="space-y-2.5">
            <div className="px-2.5 py-2 rounded-md bg-slate-900/90 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">Active CSS Rule</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {selectedSpec.rangeLabel}
                </span>
              </div>
              <div className="font-mono text-[11px] text-sky-300 truncate" title={selectedSpec.mediaQuery}>
                {selectedSpec.mediaQuery}
              </div>
              {isConstrainedByWindow && (
                <div className="text-[11px] text-amber-300 leading-snug pt-0.5">
                  Canvas width ({effectiveWidth}px) is constrained by browser window; live frame matches {BREAKPOINT_SPECS[effectiveBreakpoint].label.toLowerCase()} range.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300 tabular-nums px-0.5">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span>
                  {activeProfile.gridColumns}{' '}
                  {activeProfile.gridColumns === 1 ? 'col' : 'cols'}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>
                  {activeProfile.navigationStyle === 'drawer'
                    ? 'Drawer nav'
                    : 'Inline nav'}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>
                  {activeProfile.compactPadding ? 'Compact' : 'Standard'}
                </span>
              </div>

              <button
                type="button"
                aria-pressed={showColumnGuides}
                onClick={onToggleColumnGuides}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  showColumnGuides
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <Columns3 className="w-3 h-3" aria-hidden="true" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
