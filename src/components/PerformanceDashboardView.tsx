import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Gauge,
  Monitor,
  Smartphone,
  Tablet,
  Wrench,
} from 'lucide-react';
import {
  CoreWebVitalMetric,
  CoreWebVitalRating,
  PerfFixActionId,
  PerfSimulationProfile,
  PerfSuggestionCategory,
  PerformanceSimulationReport,
} from '../types/template';

interface PerformanceDashboardViewProps {
  report: PerformanceSimulationReport;
  profile: PerfSimulationProfile;
  onSelectProfile: (profile: PerfSimulationProfile) => void;
  onApplyFix: (fixId: PerfFixActionId) => void;
  onApplyAllFixes: (fixIds: PerfFixActionId[]) => void;
  onInspectXml: () => void;
}

type PerfFilter = 'all' | 'opportunity' | PerfSuggestionCategory;

const FILTER_TABS: { id: PerfFilter; label: string }[] = [
  { id: 'all', label: 'All Signals' },
  { id: 'opportunity', label: 'Opportunities' },
  { id: 'LCP', label: 'LCP' },
  { id: 'FID', label: 'FID' },
  { id: 'CLS', label: 'CLS' },
  { id: 'Payload', label: 'Payload' },
];

const PROFILE_OPTIONS: {
  id: PerfSimulationProfile;
  label: string;
  icon: typeof Smartphone;
}[] = [
  { id: 'mobile-4g', label: 'Mobile 4G', icon: Smartphone },
  { id: 'tablet-wifi', label: 'Tablet Wi-Fi', icon: Tablet },
  { id: 'desktop-fast', label: 'Desktop', icon: Monitor },
];

function ratingMeta(rating: CoreWebVitalRating) {
  if (rating === 'good') {
    return {
      label: 'Good',
      textClass: 'text-emerald-700',
      barClass: 'bg-emerald-600',
      borderClass: 'border-slate-200',
    };
  }
  if (rating === 'needs-improvement') {
    return {
      label: 'Needs Work',
      textClass: 'text-amber-700',
      barClass: 'bg-amber-500',
      borderClass: 'border-amber-300',
    };
  }
  return {
    label: 'Poor',
    textClass: 'text-red-700',
    barClass: 'bg-red-600',
    borderClass: 'border-red-300',
  };
}

function vitalBarPercent(metric: CoreWebVitalMetric): number {
  const maxScale = metric.poorThreshold * 1.25;
  return Math.max(4, Math.min(100, Math.round((metric.value / maxScale) * 100)));
}

export function PerformanceDashboardView({
  report,
  profile,
  onSelectProfile,
  onApplyFix,
  onApplyAllFixes,
  onInspectXml,
}: PerformanceDashboardViewProps) {
  const [filter, setFilter] = useState<PerfFilter>('all');

  const fixableIds = useMemo(
    () =>
      report.suggestions
        .filter((s) => s.status === 'opportunity' && s.fixActionId)
        .map((s) => s.fixActionId as PerfFixActionId),
    [report.suggestions]
  );

  const filteredSuggestions = useMemo(() => {
    if (filter === 'all') return report.suggestions;
    if (filter === 'opportunity') {
      return report.suggestions.filter((s) => s.status === 'opportunity');
    }
    return report.suggestions.filter((s) => s.category === filter);
  }, [report.suggestions, filter]);

  const overallMeta = ratingMeta(report.overallRating);
  const vitals: CoreWebVitalMetric[] = [report.lcp, report.fid, report.cls];

  const payloadSegments = [
    {
      label: 'Template Markup & Widgets',
      kb: report.breakdown.markupKb,
      colorClass: 'bg-slate-800',
    },
    {
      label: '<b:skin> CSS',
      kb: report.breakdown.skinCssKb,
      colorClass: 'bg-blue-600',
    },
    {
      label: 'Inline Runtime JS',
      kb: report.breakdown.inlineJsKb,
      colorClass: 'bg-teal-600',
    },
    {
      label: 'JSON-LD Schemas',
      kb: report.breakdown.jsonLdKb,
      colorClass: 'bg-indigo-500',
    },
  ];
  const totalSegmentKb = Math.max(
    1,
    payloadSegments.reduce((sum, s) => sum + s.kb, 0)
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="pb-5 border-b border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Core Web Vitals Performance Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Deterministic simulation of LCP, FID, and CLS derived directly from your generated Blogger XML payload, preload hints, fonts, and media delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {fixableIds.length > 0 && (
            <button
              type="button"
              onClick={() => onApplyAllFixes(fixableIds)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply All Optimizations ({fixableIds.length})</span>
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

      {/* Device / Network Simulation Switcher + Composite Score Strip */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center shrink-0"
            aria-label={`Simulated performance score ${report.overallScore} out of 100`}
          >
            <span
              className={`text-2xl font-bold leading-none tabular-nums ${overallMeta.textClass}`}
            >
              {report.overallScore}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1">
              / 100
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Gauge className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Simulated Performance Index</span>
              </span>
              <span className={`text-xs font-semibold ${overallMeta.textClass}`}>
                · {overallMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-600 tabular-nums">
              Profile: <strong className="font-medium text-slate-800">{report.profileLabel}</strong> ({report.networkLabel})
            </p>
            <p className="text-xs text-slate-500 tabular-nums">
              {report.passedCount}/{report.suggestions.length} speed signals optimal ·{' '}
              {report.opportunityCount === 0
                ? 'All template speed optimizations enabled'
                : `${report.opportunityCount} optimization opportunity${report.opportunityCount === 1 ? '' : 's'} available`}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500">
            Simulation Environment
          </div>
          <div
            role="radiogroup"
            aria-label="Simulated network and device profile"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
          >
            {PROFILE_OPTIONS.map(({ id, label, icon: Icon }) => {
              const active = profile === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelectProfile(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Web Vitals Trio (LCP, FID, CLS) */}
      <section
        aria-label="Simulated Core Web Vitals"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {vitals.map((metric) => {
          const meta = ratingMeta(metric.rating);
          const pct = vitalBarPercent(metric);
          const goodMarkPct = Math.round(
            (metric.goodThreshold / (metric.poorThreshold * 1.25)) * 100
          );

          return (
            <div
              key={metric.id}
              className={`bg-white border rounded-lg p-5 space-y-4 ${meta.borderClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-semibold text-slate-500">
                    {metric.shortLabel}
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                    {metric.name}
                  </h2>
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${meta.textClass}`}
                >
                  {meta.label}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {metric.displayValue}
                </span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {metric.goodTargetLabel}
                </span>
              </div>

              {/* Threshold Gauge Bar */}
              <div className="space-y-1.5">
                <div className="relative h-2 w-full bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${meta.barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    aria-hidden="true"
                    title={`Google Good threshold: ${metric.goodTargetLabel}`}
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40"
                    style={{ left: `${goodMarkPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  {metric.primaryDriver}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* XML Payload & Structural Telemetry Breakdown */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                XML Payload &amp; Resource Budget Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Measured byte distribution of the generated Blogger template and estimated runtime footprint.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
            <span>
              Document: <strong className="text-slate-900">{report.breakdown.xmlTotalKb} KB</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Est. DOM: <strong className="text-slate-900">~{report.breakdown.domNodeEstimate} nodes</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Media: <strong className="text-slate-900">{report.breakdown.mediaPayloadKb} KB</strong>
            </span>
          </div>
        </div>

        {/* Stacked Byte Composition Bar */}
        <div className="space-y-3">
          <div className="flex h-3 w-full rounded-xs overflow-hidden bg-slate-100">
            {payloadSegments.map((seg) => (
              <div
                key={seg.label}
                className={seg.colorClass}
                style={{ width: `${(seg.kb / totalSegmentKb) * 100}%` }}
                title={`${seg.label}: ${seg.kb} KB`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {payloadSegments.map((seg) => (
              <div
                key={seg.label}
                className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1"
              >
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${seg.colorClass}`} />
                  <span className="truncate">{seg.label}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {seg.kb} KB
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Structural Signals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs tabular-nums">
          <div>
            <div className="text-slate-500">LCP Preload Hints</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {report.breakdown.preloadCount} active
            </div>
          </div>
          <div>
            <div className="text-slate-500">AVIF/WebP Pictures</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {report.breakdown.avifWebpPictureCount} adaptive {report.breakdown.avifWebpPictureCount === 1 ? 'block' : 'blocks'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Webfont Families</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {report.breakdown.fontFamilyCount} {report.breakdown.fontFamilyCount === 1 ? 'family' : 'families'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Blocking External JS</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {report.breakdown.externalBlockingScripts} {report.breakdown.externalBlockingScripts === 1 ? 'script' : 'scripts'}
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar + Actionable Optimization Suggestions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter performance optimization suggestions"
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
                  {tab.id === 'opportunity' && report.opportunityCount > 0
                    ? ` (${report.opportunityCount})`
                    : ''}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Showing {filteredSuggestions.length} of {report.suggestions.length} signals
          </div>
        </div>

        {filteredSuggestions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
            <CheckCircle2
              className="w-6 h-6 text-emerald-600 mx-auto"
              aria-hidden="true"
            />
            <div className="text-sm font-semibold text-slate-900">
              All Core Web Vitals optimizations in this filter are active
            </div>
            <p className="text-xs text-slate-500">
              Your generated Blogger XML already incorporates every optimization for this category.
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Show All Signals
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {filteredSuggestions.map((item) => {
              const isPass = item.status === 'pass';
              const isHigh = item.impact === 'High';
              return (
                <div
                  key={item.id}
                  className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isPass
                            ? 'text-emerald-700'
                            : isHigh
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {isPass ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : isHigh ? (
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{isPass ? 'Optimal' : 'Opportunity'}</span>
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] font-medium text-slate-700">
                        {item.category}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-600 tabular-nums">
                        {item.estimatedSavings}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-500">{item.impact} Impact</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-medium text-slate-800">
                        Measured:
                      </strong>{' '}
                      {item.evidence}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-medium text-slate-800">
                        Suggestion:
                      </strong>{' '}
                      {item.recommendation}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pt-1 md:pt-0">
                    {item.fixActionId && item.fixActionLabel ? (
                      <button
                        type="button"
                        onClick={() => onApplyFix(item.fixActionId!)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {item.fixActionLabel}
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
