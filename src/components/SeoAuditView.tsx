import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Wrench,
} from 'lucide-react';
import {
  SeoAuditCategory,
  SeoAuditSummary,
  SeoFixActionId,
  SiteConfig,
} from '../types/template';

interface SeoAuditViewProps {
  config: SiteConfig;
  audit: SeoAuditSummary;
  onApplyFix: (fixId: SeoFixActionId) => void;
  onApplyAllFixes: (fixIds: SeoFixActionId[]) => void;
  onInspectXml: () => void;
}

type AuditFilter = 'all' | 'actionable' | SeoAuditCategory;

const FILTER_TABS: { id: AuditFilter; label: string }[] = [
  { id: 'all', label: 'All Checks' },
  { id: 'actionable', label: 'Action Needed' },
  { id: 'Crawlability', label: 'Crawlability' },
  { id: 'Structured Data', label: 'Structured Data' },
  { id: 'On-Page Semantics', label: 'On-Page Semantics' },
  { id: 'Core Web Vitals', label: 'Core Web Vitals' },
];

export function SeoAuditView({
  config,
  audit,
  onApplyFix,
  onApplyAllFixes,
  onInspectXml,
}: SeoAuditViewProps) {
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [serpView, setSerpView] = useState<'homepage' | 'post'>('homepage');

  const fixableIds = useMemo(
    () =>
      audit.findings
        .filter((f) => f.severity !== 'pass' && f.fixActionId)
        .map((f) => f.fixActionId as SeoFixActionId),
    [audit.findings]
  );

  const filteredFindings = useMemo(() => {
    if (filter === 'all') return audit.findings;
    if (filter === 'actionable') {
      return audit.findings.filter((f) => f.severity !== 'pass');
    }
    return audit.findings.filter((f) => f.category === filter);
  }, [audit.findings, filter]);

  const samplePost = config.insights[0];
  const cleanDomainDisplay = config.domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');

  const serpTitle =
    serpView === 'homepage'
      ? `${config.companyName} — ${config.tagline}`
      : `${samplePost?.title || 'Cloud Architecture Blueprint'} | ${config.companyName}`;

  const serpDescription =
    serpView === 'homepage'
      ? config.heroSubheadline
      : samplePost?.tldrSummary || config.tagline;

  const serpBreadcrumb =
    serpView === 'homepage'
      ? config.domain
      : `${cleanDomainDisplay} › ${samplePost?.category || 'Insights'} › ${samplePost?.slug || 'blueprint'}`;

  const actionableCount = audit.warningCount + audit.criticalCount;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            XML Search Visibility &amp; SEO Audit
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time structural analysis of your generated Blogger XML for Google Search crawlability, rich results, and Core Web Vitals.
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
              <span>Apply All Fixes ({fixableIds.length})</span>
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

      {/* Deterministic Structural Metrics Strip */}
      <section
        aria-label="Audit summary metrics"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
      >
        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">Checks Passed</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.passedCount} / {audit.totalChecks}
          </div>
          <div className="text-xs text-slate-500">
            {actionableCount === 0
              ? 'All search visibility checks nominal'
              : `${actionableCount} recommendation${actionableCount === 1 ? '' : 's'} ready`}
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            JSON-LD Schemas
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.jsonLdBlockCount}
          </div>
          <div className="text-xs text-slate-500">
            Organization, Breadcrumb, Article, FAQ
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">
            Optimized Images
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.imgOptimizedCount} / {audit.imgTotalCount}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            {audit.preloadTagCount} critical LCP preload hints
          </div>
        </div>

        <div className="p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">XML Payload</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {audit.xmlSizeKb} KB
          </div>
          <div className="text-xs text-slate-500">
            {config.minifyXml ? 'Minified output active' : 'Unminified formatted XML'}
          </div>
        </div>
      </section>

      {/* Live Google SERP Preview */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Google Search Result Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulated snippet generated from your current XML &lt;title&gt;, canonical domain, and meta description configuration.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="SERP preview type"
            className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
          >
            <button
              type="button"
              role="tab"
              aria-selected={serpView === 'homepage'}
              onClick={() => setSerpView('homepage')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                serpView === 'homepage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Homepage SERP
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={serpView === 'post'}
              onClick={() => setSerpView('post')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                serpView === 'post'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Post SERP
            </button>
          </div>
        </div>

        <div className="max-w-2xl space-y-1.5">
          <div className="text-xs text-slate-600 truncate">{serpBreadcrumb}</div>
          <div className="text-lg font-medium text-blue-800 leading-snug">
            {serpTitle.length > 68 ? `${serpTitle.slice(0, 65)}...` : serpTitle}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {serpDescription.length > 162
              ? `${serpDescription.slice(0, 159)}...`
              : serpDescription}
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>Title length: {serpTitle.length} chars</span>
            <span aria-hidden="true">·</span>
            <span>
              Open Graph &amp; Twitter Cards:{' '}
              {config.includeSocialMetaTags ? 'Enabled' : 'Not Injected'}
            </span>
          </div>
        </div>
      </section>

      {/* Filter Bar + Actionable Audit Table */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter SEO audit findings"
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
              Zero open SEO findings in this view
            </div>
            <p className="text-xs text-slate-500">
              All analyzed checks for this filter currently pass Google Search best practices.
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
                          {isPass ? 'Pass' : isCritical ? 'Issue' : 'Improve'}
                        </span>
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-600">{finding.category}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-500">
                        {finding.impact} Impact
                      </span>
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
                        Recommendation:
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
