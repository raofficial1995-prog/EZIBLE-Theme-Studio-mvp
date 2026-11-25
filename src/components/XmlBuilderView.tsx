import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlignLeft,
} from 'lucide-react';
import { SiteConfig, XmlPhaseId, XmlValidationReport } from '../types/template';
import {
  getPhaseXmlSnippet,
  getXmlMinificationStats,
} from '../lib/bloggerXmlGenerator';
import { prettyPrintBloggerXml } from '../lib/xmlFormatter';

interface XmlBuilderViewProps {
  config: SiteConfig;
  validation: XmlValidationReport;
  onDownloadXml: (filename: string, content: string) => void;
}

const PHASES: { id: XmlPhaseId; label: string; filename: string; summary: string }[] = [
  {
    id: 'merged',
    label: 'Full Single-File XML',
    filename: 'ezible-it-solutions.xml',
    summary: 'Complete production template ready for Blogger Dashboard > Theme > Restore > Upload.',
  },
  {
    id: 'step1',
    label: 'Step 1: Skeleton & Schema',
    filename: 'ezible-step1-skeleton-schema.xml',
    summary: 'XML namespaces, <b:skin> Theme Designer variables, 12-column CSS Grid, JSON-LD, and sticky header.',
  },
  {
    id: 'step2',
    label: 'Step 2: Homepage & Devices',
    filename: 'ezible-step2-homepage.xml',
    summary: 'Editable Hero, Services, Case Studies, Reviews, and separate Desktop/Tablet/Mobile Layout widget zones.',
  },
  {
    id: 'step3',
    label: 'Step 3: Blogs, Archive & Post',
    filename: 'ezible-step3-blog-aeo.xml',
    summary: 'Homepage 3–6 blog cap (no tags), separate All Blogs page with Label1 tags & pagination, and dynamic AEO single posts.',
  },
  {
    id: 'step4',
    label: 'Step 4: Forms & Responsive JS',
    filename: 'ezible-step4-footer-forms.xml',
    summary: 'Device-toggleable Newsletter & ContactForm1 with honeypot trap, lightbox, and mobile/tablet drawer menu JS.',
  },
];

export function XmlBuilderView({
  config,
  validation,
  onDownloadXml,
}: XmlBuilderViewProps) {
  const [activePhase, setActivePhase] = useState<XmlPhaseId>('merged');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [prettyPrint, setPrettyPrint] = useState(false);
  const [indentSize, setIndentSize] = useState<2 | 4>(2);

  const activePhaseMeta = PHASES.find((p) => p.id === activePhase) || PHASES[0];

  const rawXmlCode = useMemo(
    () => getPhaseXmlSnippet(config, activePhase),
    [config, activePhase]
  );

  const xmlCode = useMemo(
    () => (prettyPrint ? prettyPrintBloggerXml(rawXmlCode, indentSize) : rawXmlCode),
    [rawXmlCode, prettyPrint, indentSize]
  );

  const minificationStats = useMemo(
    () => getXmlMinificationStats(config),
    [config]
  );

  const isMinifiedView = activePhase === 'merged' && config.minifyXml && !prettyPrint;

  const lines = useMemo(() => xmlCode.split('\n'), [xmlCode]);

  const matchingLineNumbers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return new Set<number>();
    const matches = new Set<number>();
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q)) {
        matches.add(idx + 1);
      }
    });
    return matches;
  }, [lines, searchTerm]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const passedCount = validation.checks.filter((c) => c.passed).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Page Header & Validation Summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Modular Blogger XML Generator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect each modular build phase individually or export the merged, parser-verified single-file template.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
            {validation.wellFormed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden="true" />
            )}
            <span>
              {validation.wellFormed ? 'XML Valid' : 'XML Syntax Error'}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {passedCount}/{validation.checks.length} Checks Passed
          </span>
          <span aria-hidden="true">·</span>
          <span>{lines.length.toLocaleString()} lines</span>
          <span aria-hidden="true">·</span>
          <span>{(new TextEncoder().encode(xmlCode).length / 1024).toFixed(1)} KB</span>
          {prettyPrint && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-blue-700 font-medium">
                Pretty Printed ({indentSize} spaces)
              </span>
            </>
          )}
          {isMinifiedView && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-medium">
                -{minificationStats.savedPercent}% minified
              </span>
            </>
          )}
        </div>
      </div>

      {/* Phase Segmented Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="XML build phases"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg"
        >
          {PHASES.map((phase) => {
            const isSelected = activePhase === phase.id;
            return (
              <button
                key={phase.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActivePhase(phase.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {phase.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              aria-pressed={prettyPrint}
              onClick={() => setPrettyPrint((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                prettyPrint
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
              title="Format XML with consistent indentation for easier reading and editing"
            >
              <AlignLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pretty Print</span>
              <span
                className={`ml-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  prettyPrint ? 'text-blue-700' : 'text-slate-400'
                }`}
              >
                {prettyPrint ? 'On' : 'Off'}
              </span>
            </button>
            {prettyPrint && (
              <div
                role="group"
                aria-label="Indentation spaces"
                className="flex items-center border-l border-slate-200 bg-slate-50/70"
              >
                {([2, 4] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={indentSize === size}
                    onClick={() => setIndentSize(size)}
                    className={`px-2 py-1.5 text-[11px] font-medium tabular-nums transition-colors cursor-pointer ${
                      indentSize === size
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {size}sp
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{copied ? 'Copied XML' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadXml(activePhaseMeta.filename, xmlCode)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export {activePhaseMeta.filename}</span>
          </button>
        </div>
      </div>

      {/* Active Phase Context + Live Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3">
        <div className="text-xs text-slate-600">
          <strong className="text-slate-900 font-semibold">
            {activePhaseMeta.filename}
          </strong>
          <span className="mx-2 text-slate-300" aria-hidden="true">/</span>
          <span>{activePhaseMeta.summary}</span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search XML tags or variables..."
            aria-label="Search XML tags or variables"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
          />
        </div>
      </div>

      {searchTerm.trim() && (
        <div className="text-xs text-slate-600 tabular-nums">
          Found <strong className="text-slate-900">{matchingLineNumbers.size}</strong> matching lines for &ldquo;{searchTerm}&rdquo;.
        </div>
      )}

      {/* Code Viewer */}
      <div className="bg-slate-950 text-slate-100 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-auto max-h-[540px] p-4 font-mono text-xs leading-6">
          {lines.map((line, index) => {
            const lineNum = index + 1;
            const isMatch = matchingLineNumbers.has(lineNum);
            return (
              <div
                key={lineNum}
                className={`flex gap-4 px-2 rounded-xs ${
                  isMatch ? 'bg-blue-500/25 text-white' : 'hover:bg-slate-900/70'
                }`}
              >
                <span className="w-10 text-right select-none text-slate-500 tabular-nums shrink-0">
                  {lineNum}
                </span>
                <span
                  className={
                    isMinifiedView
                      ? 'whitespace-pre-wrap break-all text-slate-200'
                      : 'whitespace-pre text-slate-200'
                  }
                >
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Automated XML & Blogger Compliance Table */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Automated XML &amp; Blogger Lint Report
        </h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Validation Check</th>
                  <th className="py-2.5 px-4 font-semibold">Result</th>
                  <th className="py-2.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validation.checks.map((check) => (
                  <tr key={check.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {check.category}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {check.label}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          check.passed ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {check.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{check.passed ? 'Pass' : 'Fail'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
