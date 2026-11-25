import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Eye,
  Wrench,
} from 'lucide-react';
import {
  A11yAuditCategory,
  A11yAuditSummary,
  A11yFixActionId,
} from '../types/template';

interface AccessibilityAuditViewProps {
  audit: A11yAuditSummary;
  onApplyFix: (fixId: A11yFixActionId) => void;
  onApplyAllFixes: (fixIds: A11yFixActionId[]) => void;
  onInspectXml: () => void;
}

type A11yFilter = 'all' | 'actionable' | A11yAuditCategory;

const FILTER_TABS: { id: A11yFilter; label: string }[] = [
  { id: 'all', label: 'All Checks' },
  { id: 'actionable', label: 'Action Needed' },
  { id: 'Alt Text & Media', label: 'Alt Text & Media' },
  { id: 'Color Contrast', label: 'Color Contrast' },
  { id: 'ARIA & Landmarks', label: 'ARIA & Landmarks' },
  { id: 'Keyboard & Motion', label: 'Keyboard & Motion' },
];

export function AccessibilityAuditView({
  audit,
  onApplyFix,
  onApplyAllFixes,
  onInspectXml,
}: AccessibilityAuditViewProps) {
  const [filter, setFilter] = useState<A11yFilter>('all');

  const fixableIds = useMemo(() => {
    const ids = new Set<A11yFixActionId>();
    audit.findings.forEach((f) => {
      if (f.severity !== 'pass' && f.fixActionId) {
        ids.add(f.fixActionId);
      }
    });
    return Array.from(ids);
  }, [audit.findings]);

  const filteredFindings = useMemo(() => {
    if (filter === 'all') return audit.findings;
    if (filter === 'actionable') {
      return audit.findings.filter((f) => f.severity !== 'pass');
    }
    return audit.findings.filter((f) => f.category === filter);
  }, [audit.findings, filter]);

  const actionableCount = audit.warningCount + audit.criticalCount;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="pb-5 border-b border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            WCAG 2.1 Accessibility Audit
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live scanner analyzing your generated Blogger XML for missing alt attributes, WCAG AA color contrast ratios, ARIA labels, and keyboard navigation compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {fixableIds.length > 0 && (
            <button
              type="button"
              onClick={() => onApplyAllFixes(fixableIds)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply All WCAG Fixes ({fixableIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={onInspectXml}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open XML Builder</span>
          </button>
        </div>
      </div>

      {/* Deterministic WCAG Metrics Strip */}
      <section
        aria-label="Accessibility summary metrics"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
      >
        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">WCAG Checks Passed</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.passedCount} / {audit.totalChecks}
          </div>
          <div className="text-xs text-slate-500">
            {actionableCount === 0
              ? 'WCAG 2.1 AA checks passing'
              : `${actionableCount} issue${actionableCount === 1 ? '' : 's'} to resolve`}
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">Alt Text Coverage</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.imgWithAltCount} / {audit.imgTotalCount}
          </div>
          <div className="text-xs text-slate-500">
            {audit.imgWithAltCount === audit.imgTotalCount
              ? 'Every <img> has descriptive alt'
              : `${audit.imgTotalCount - audit.imgWithAltCount} image(s) missing alt`}
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">Contrast Ratios (AA)</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.contrastPassedCount} / {audit.contrastChecks.length}
          </div>
          <div className="text-xs text-slate-500">
            Minimum 4.5:1 normal text threshold
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">ARIA &amp; Landmarks</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.ariaLabelCount}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            ARIA labels across {audit.landmarkCount} landmarks
          </div>
        </div>
      </section>

      {/* Live Color Contrast Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <Eye className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Live Color Contrast Matrix (WCAG 1.4.3)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Computed from your active Theme Studio palette variables using W3C sRGB relative luminance.
              </p>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-600 tabular-nums">
            {audit.contrastPassedCount === audit.contrastChecks.length
              ? 'All 5 pairs meet WCAG AA'
              : `${audit.contrastChecks.length - audit.contrastPassedCount} pair(s) below 4.5:1`}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {audit.contrastChecks.map((item) => (
            <div
              key={item.id}
              className={`border rounded-md overflow-hidden flex flex-col justify-between ${
                item.passesAA ? 'border-slate-200' : 'border-red-300 bg-red-50/20'
              }`}
            >
              <div
                className="px-4 py-3.5 border-b border-black/10"
                style={{
                  backgroundColor: item.background,
                  color: item.foreground,
                }}
              >
                <div className="text-xs font-semibold leading-snug">
                  {item.sampleText}
                </div>
                <div className="mt-1 font-mono text-[10px] opacity-85 tabular-nums">
                  FG {item.foreground.toUpperCase()} / BG {item.background.toUpperCase()}
                </div>
              </div>

              <div className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 truncate">
                    {item.label}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 tabular-nums">
                    <span
                      className={`font-mono font-semibold ${
                        item.passesAA ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.ratio.toFixed(2)}:1
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span
                      className={`text-[11px] font-medium ${
                        item.passesAA ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.passesAAA ? 'AAA Pass' : item.passesAA ? 'AA Pass' : 'AA Fail'}
                    </span>
                  </div>
                </div>

                {!item.passesAA && item.fixActionId && (
                  <button
                    type="button"
                    onClick={() => onApplyFix(item.fixActionId!)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Fix Ratio
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Bar + Findings List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter accessibility audit findings"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg"
          >
            {FILTER_TABS.map((tab) => {
              const selected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'actionable' && actionableCount > 0
                    ? ` (${actionableCount})`
                    : ''}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Showing {filteredFindings.length} of {audit.totalChecks} checks
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
            <CheckCircle2
              className="w-6 h-6 text-emerald-600 mx-auto"
              aria-hidden="true"
            />
            <div className="text-sm font-semibold text-slate-900">
              Zero open WCAG findings in this view
            </div>
            <p className="text-xs text-slate-500">
              All scanned XML accessibility checks in this filter currently meet WCAG 2.1 AA standards.
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Show All Checks
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {filteredFindings.map((finding) => {
              const isPass = finding.severity === 'pass';
              const isCritical = finding.severity === 'critical';
              return (
                <div
                  key={finding.id}
                  className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isPass
                            ? 'text-emerald-700'
                            : isCritical
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {isPass ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : isCritical ? (
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {isPass ? 'Pass' : isCritical ? 'Fail' : 'Improve'}
                        </span>
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {finding.wcagCriterion} (Level {finding.wcagLevel})
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-600">{finding.category}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">
                      {finding.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-medium text-slate-800">
                        Detected:
                      </strong>{' '}
                      {finding.evidence}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-medium text-slate-800">
                        Remediation:
                      </strong>{' '}
                      {finding.recommendation}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pt-1 md:pt-0">
                    {finding.fixActionId && finding.fixActionLabel ? (
                      <button
                        type="button"
                        onClick={() => onApplyFix(finding.fixActionId!)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {finding.fixActionLabel}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onInspectXml}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        View in XML
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
