import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  RotateCcw,
  Star,
} from 'lucide-react';
import { SiteConfig, XmlValidationReport } from '../types/template';
import { buildJsonLdPreviewObjects } from '../lib/bloggerXmlGenerator';
import {
  RichResultSchemaKey,
  RichResultValidationResult,
  validateJsonLdForGoogleRichResults,
} from '../lib/richResultsValidator';

interface SchemaSeoViewProps {
  config: SiteConfig;
  validation: XmlValidationReport;
}

const SCHEMA_TABS: { id: RichResultSchemaKey; label: string; scope: string }[] = [
  { id: 'organization', label: 'Organization & ITService', scope: 'All Pages' },
  { id: 'breadcrumb', label: 'BreadcrumbList', scope: 'All Pages' },
  { id: 'article', label: 'TechArticle', scope: 'Single Posts' },
  { id: 'faqPage', label: 'FAQPage', scope: 'Single Posts' },
  { id: 'reviews', label: 'Client Reviews', scope: 'Homepage' },
];

const AEO_SNIPPETS: { id: string; title: string; className: string; html: string }[] = [
  {
    id: 'tldr',
    title: 'Key Takeaways / TL;DR Callout',
    className: '.aeo-tldr-box',
    html: `<section class="aeo-tldr-box" aria-label="Key Takeaways">
  <h2>Key Takeaways / TL;DR</h2>
  <p>Direct 2-sentence answer summarizing the architecture decision, cost impact, and verified timeline for AI Overview extraction.</p>
  <ul>
    <li>Primary engineering recommendation with concrete unit or SLA threshold.</li>
    <li>Security or compliance guardrail verified in production.</li>
  </ul>
</section>`,
  },
  {
    id: 'table',
    title: 'GEO Structured Comparison Table',
    className: '.geo-spec-table',
    html: `<table class="geo-spec-table">
  <thead>
    <tr>
      <th>Criterion</th>
      <th>Legacy Pattern</th>
      <th>EZIBLE Architecture</th>
      <th>Measured Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Recovery Time Objective (RTO)</td>
      <td>45 minutes (manual)</td>
      <td>&lt; 30 seconds (automated)</td>
      <td>98% faster failover</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'faq',
    title: 'Semantic FAQ Accordion Block',
    className: '.faq-accordion',
    html: `<div class="faq-accordion">
  <details open>
    <summary>How long does an enterprise cloud migration take?</summary>
    <p>Typical phased migrations complete in 8 to 14 weeks with zero planned downtime using blue-green cutovers.</p>
  </details>
  <details>
    <summary>Does EZIBLE support SOC 2 Type II compliance?</summary>
    <p>Yes. Every infrastructure module ships with automated policy checks and audit-ready evidence logging.</p>
  </details>
</div>`,
  },
];

function RichResultVisualPreview({
  schemaKey,
  result,
  domain,
}: {
  schemaKey: RichResultSchemaKey;
  result: RichResultValidationResult;
  domain: string;
}) {
  const [expandedFaq, setExpandedFaq] = useState(0);

  if (!result.parsed) {
    return (
      <div className="p-5 bg-red-50/70 border border-red-200 rounded-md text-xs text-red-800 space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Cannot render Rich Result preview until JSON syntax is valid</span>
        </div>
        <p className="font-mono text-[11px]">{result.syntaxError}</p>
      </div>
    );
  }

  const data = result.parsed;
  const cleanHost = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '');

  if (schemaKey === 'organization') {
    const knows = Array.isArray(data.knowsAbout)
      ? (data.knowsAbout as string[])
      : [];
    const catalog = data.hasOfferCatalog as Record<string, unknown> | undefined;
    const offerCount = Array.isArray(catalog?.itemListElement)
      ? catalog.itemListElement.length
      : 0;

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-base font-bold text-slate-900">
              {String(data.name || 'Unnamed Organization')}
            </div>
            <div className="text-xs text-slate-500">
              {String(data.url || domain)} · {String(data.areaServed || 'Global')}
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
            {offerCount} ITServices
          </span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          {String(data.description || '')}
        </p>
        {knows.length > 0 && (
          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-medium text-slate-800">Knowledge Graph topics:</span>{' '}
            {knows.join(' · ')}
          </div>
        )}
      </div>
    );
  }

  if (schemaKey === 'breadcrumb') {
    const items = Array.isArray(data.itemListElement)
      ? (data.itemListElement as Record<string, unknown>[])
      : [];
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-1.5">
        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-slate-800">{cleanHost}</span>
          {items.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">›</span>
              <span>{String(item.name || 'Untitled')}</span>
            </span>
          ))}
        </div>
        <div className="text-base font-medium text-blue-800">
          {String(items[items.length - 1]?.name || 'Page Title')}
        </div>
        <p className="text-xs text-slate-600">
          Google replaces raw blog URLs with this structured breadcrumb path on desktop and mobile search results.
        </p>
      </div>
    );
  }

  if (schemaKey === 'article') {
    const authorObj = data.author as Record<string, unknown> | undefined;
    const authorName =
      typeof authorObj?.name === 'string'
        ? authorObj.name
        : String(data.author || 'Unknown Author');
    const pubDate =
      typeof data.datePublished === 'string'
        ? data.datePublished.slice(0, 10)
        : 'No date';

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-2">
        <div className="text-xs text-slate-500 tabular-nums">
          {cleanHost} · TechArticle · Published {pubDate}
        </div>
        <div className="text-base font-semibold text-blue-800 leading-snug">
          {String(data.headline || 'Missing Headline')}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {String(data.description || '')}
        </p>
        <div className="text-xs text-slate-500 pt-1">
          By <span className="font-medium text-slate-800">{authorName}</span>
        </div>
      </div>
    );
  }

  if (schemaKey === 'faqPage') {
    const questions = Array.isArray(data.mainEntity)
      ? (data.mainEntity as Record<string, unknown>[])
      : [];
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-2.5">
        <div className="text-xs text-slate-500">
          {cleanHost} · FAQ Rich Result Preview
        </div>
        <div className="divide-y divide-slate-200 border border-slate-200 rounded bg-white">
          {questions.slice(0, 3).map((q, idx) => {
            const ans = q.acceptedAnswer as Record<string, unknown> | undefined;
            const open = expandedFaq === idx;
            return (
              <div key={idx}>
                <button
                  type="button"
                  onClick={() => setExpandedFaq(open ? -1 : idx)}
                  className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 text-xs font-semibold text-slate-900 cursor-pointer"
                >
                  <span>{String(q.name || 'Missing Question')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div className="px-3.5 pb-3 text-xs text-slate-600 leading-relaxed">
                    {String(ans?.text || 'Missing Answer text')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Reviews preview
  const reviews = Array.isArray(data.itemListElement)
    ? (data.itemListElement as Record<string, unknown>[])
    : [];
  const ratings = reviews
    .map((r) => Number((r.reviewRating as Record<string, unknown> | undefined)?.ratingValue))
    .filter((n) => !Number.isNaN(n));
  const avg =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '0.0';
  const firstAuthor = (reviews[0]?.author as Record<string, unknown> | undefined)?.name;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-2">
      <div className="text-xs text-slate-500">{cleanHost} · Verified Client Reviews</div>
      <div className="text-base font-semibold text-blue-800">
        {String(data.name || 'Client Reviews')}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-700 tabular-nums">
        <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-current" />
          ))}
        </span>
        <span className="font-semibold">Rating: {avg} / 5.0</span>
        <span aria-hidden="true">·</span>
        <span>{reviews.length} reviews</span>
      </div>
      {reviews[0] && (
        <p className="text-xs text-slate-600 leading-relaxed">
          &ldquo;{String(reviews[0].reviewBody || '').slice(0, 150)}...&rdquo; —{' '}
          <span className="font-medium text-slate-800">{String(firstAuthor || '')}</span>
        </p>
      )}
    </div>
  );
}

export function SchemaSeoView({ config, validation }: SchemaSeoViewProps) {
  const [selectedSchema, setSelectedSchema] =
    useState<RichResultSchemaKey>('organization');
  const [customDrafts, setCustomDrafts] = useState<
    Partial<Record<RichResultSchemaKey, string>>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const schemaObjects = useMemo(() => buildJsonLdPreviewObjects(config), [config]);

  const generatedStrings = useMemo(
    () => ({
      organization: JSON.stringify(schemaObjects.organization, null, 2),
      breadcrumb: JSON.stringify(schemaObjects.breadcrumb, null, 2),
      article: JSON.stringify(schemaObjects.article, null, 2),
      faqPage: JSON.stringify(schemaObjects.faqPage, null, 2),
      reviews: JSON.stringify(schemaObjects.reviews, null, 2),
    }),
    [schemaObjects]
  );

  // Real-time Rich Results validation across all 5 schema types
  const allValidations = useMemo(() => {
    const map = {} as Record<RichResultSchemaKey, RichResultValidationResult>;
    for (const tab of SCHEMA_TABS) {
      const source = customDrafts[tab.id] ?? generatedStrings[tab.id];
      map[tab.id] = validateJsonLdForGoogleRichResults(tab.id, source);
    }
    return map;
  }, [customDrafts, generatedStrings]);

  const activeRawJson =
    customDrafts[selectedSchema] ?? generatedStrings[selectedSchema];
  const activeValidation = allValidations[selectedSchema];
  const hasCustomEdit = customDrafts[selectedSchema] !== undefined;

  const eligibleTotal = SCHEMA_TABS.filter((t) => allValidations[t.id].eligible).length;

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const handleResetDraft = () => {
    setCustomDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedSchema];
      return next;
    });
  };

  const handleFormatDraft = () => {
    try {
      const pretty = JSON.stringify(JSON.parse(activeRawJson), null, 2);
      setCustomDrafts((prev) => ({ ...prev, [selectedSchema]: pretty }));
    } catch {
      // Keep current text if JSON has syntax error
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <div className="pb-5 border-b border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            JSON-LD Rich Results Validator &amp; Preview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect or edit every generated JSON-LD block in real time to verify eligibility against Google Search Central Rich Results requirements.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span
            className={`inline-flex items-center gap-1.5 font-semibold ${
              eligibleTotal === SCHEMA_TABS.length
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {eligibleTotal === SCHEMA_TABS.length ? (
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            )}
            <span>
              {eligibleTotal}/{SCHEMA_TABS.length} Rich Result Types Eligible
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Entity: {config.companyName}</span>
        </div>
      </div>

      {/* All-Schema Google Rich Results Status Matrix */}
      <section
        aria-label="Rich Results eligibility overview"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        {SCHEMA_TABS.map((tab) => {
          const res = allValidations[tab.id];
          const isSelected = selectedSchema === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedSchema(tab.id)}
              className={`p-4 text-left transition-colors cursor-pointer space-y-1.5 ${
                isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    res.eligible ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {res.eligible ? (
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{res.eligible ? 'Eligible' : `${res.errorCount} Error`}</span>
                </span>
                <span className="text-[11px] text-slate-400">{tab.scope}</span>
              </div>
              <div
                className={`text-xs font-semibold truncate ${
                  isSelected ? 'text-blue-800' : 'text-slate-900'
                }`}
              >
                {tab.label}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {res.validCount} valid · {res.warningCount} warn · {res.errorCount} err
              </div>
            </button>
          );
        })}
      </section>

      {/* Split Real-Time JSON-LD Editor + Google Rich Result Preview & Field Checks */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Editable JSON-LD Playground */}
        <div className="lg:col-span-6 bg-slate-950 text-slate-100 rounded-lg border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <span className="font-mono text-slate-200 font-medium">
                {activeValidation.schemaLabel}
              </span>
              <span className="mx-2 text-slate-600" aria-hidden="true">/</span>
              <span className="text-slate-400">
                {hasCustomEdit ? 'Testing live edit' : 'Live generated JSON-LD'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasCustomEdit && (
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFormatDraft}
                className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded hover:text-white cursor-pointer"
              >
                Format
              </button>
              <button
                type="button"
                onClick={() => copyText('jsonld', activeRawJson)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-700 rounded hover:bg-blue-600 cursor-pointer"
              >
                {copiedId === 'jsonld' ? (
                  <Check className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Copy className="w-3 h-3" aria-hidden="true" />
                )}
                <span>{copiedId === 'jsonld' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <textarea
            aria-label={`Live JSON-LD editor for ${activeValidation.schemaLabel}`}
            spellCheck={false}
            value={activeRawJson}
            onChange={(e) =>
              setCustomDrafts((prev) => ({
                ...prev,
                [selectedSchema]: e.target.value,
              }))
            }
            className="w-full min-h-[440px] p-4 bg-slate-950 text-slate-200 font-mono text-xs leading-6 resize-y focus:outline-none"
          />

          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Edit JSON above to test Google Rich Results error &amp; warning detection in real time.
            </span>
            <span
              className={
                activeValidation.jsonSyntaxValid
                  ? 'text-emerald-400 font-medium'
                  : 'text-red-400 font-medium'
              }
            >
              {activeValidation.jsonSyntaxValid ? 'Valid JSON' : 'Syntax Error'}
            </span>
          </div>
        </div>

        {/* Right: Live Rich Result Preview + Google Specification Validation Table */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {activeValidation.richResultFeature}
                </h2>
                <p className="text-xs text-slate-500">
                  Live Google Search appearance parsed directly from the JSON-LD editor.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeValidation.eligible ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {activeValidation.eligible ? (
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {activeValidation.eligible
                    ? 'Rich Result Eligible'
                    : 'Not Eligible'}
                </span>
              </span>
            </div>

            <RichResultVisualPreview
              schemaKey={selectedSchema}
              result={activeValidation}
              domain={config.domain}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">
                Google Search Central Property Checks
              </span>
              <span className="text-slate-500 tabular-nums">
                {activeValidation.validCount} valid · {activeValidation.warningCount} warn ·{' '}
                {activeValidation.errorCount} err
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeValidation.checks.map((check) => (
                <div
                  key={check.field}
                  className="px-4 py-3 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">
                        {check.field}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-500">{check.requirement}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {check.message}
                    </p>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        check.status === 'valid'
                          ? 'text-emerald-700'
                          : check.status === 'error'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {check.status === 'valid' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : check.status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {check.status === 'valid'
                          ? 'Valid'
                          : check.status === 'error'
                          ? 'Error'
                          : 'Warning'}
                      </span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400 max-w-[160px] truncate">
                      {check.valuePreview}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reusable AEO/GEO Blogger Post Snippets */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Reusable AEO / GEO Post Editor Snippets
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Paste these semantic HTML blocks directly into Blogger&apos;s HTML Post Editor; their styles are pre-compiled inside your template&apos;s &lt;b:skin&gt;.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {AEO_SNIPPETS.map((snippet) => (
            <div
              key={snippet.id}
              className="bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {snippet.title}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {snippet.className}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(snippet.id, snippet.html)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedId === snippet.id ? (
                    <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>{copiedId === snippet.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] leading-5 overflow-x-auto flex-1">
                {snippet.html}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Phase 3 Technical Checklist Verification */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Phase 3 Technical Audit Summary
        </h2>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {validation.checks
            .filter(
              (c) =>
                c.category === 'SEO / AEO / GEO' ||
                c.category === 'Performance & Security'
            )
            .map((item) => (
              <div
                key={item.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Verified in XML</span>
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
