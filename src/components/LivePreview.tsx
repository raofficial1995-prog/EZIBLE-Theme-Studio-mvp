import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Code2,
  Cpu,
  Database,
  Layers,
  Link2,
  Maximize2,
  Menu,
  Monitor,
  Ruler,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  Tablet,
  X,
} from 'lucide-react';
import {
  CaseStudyItem,
  DeviceProfileKey,
  SiteConfig,
  XmlValidationReport,
} from '../types/template';
import { TEMPLATE_IMAGES } from '../data/defaultConfig';
import {
  buildCc0ArchitecturalSvgUri,
  getCc0SvgBundleSizeKb,
  SvgGraphicKind,
  WEBP_ASSET_SIZES_KB,
} from '../lib/lightweightAssets';
import {
  BREAKPOINT_ORDER,
  BREAKPOINT_SPECS,
  ResponsiveTestingOverlay,
} from './ResponsiveTestingOverlay';

interface LivePreviewProps {
  config: SiteConfig;
  validation: XmlValidationReport;
  viewport: DeviceProfileKey;
  onSelectViewport: (device: DeviceProfileKey) => void;
  onInspectXml: () => void;
}

type PreviewPage = 'homepage' | 'blogs' | 'post';

function ServiceIcon({ iconKey, color }: { iconKey: string; color: string }) {
  const props = {
    className: 'w-5 h-5',
    style: { color },
    'aria-hidden': true as const,
  };
  switch (iconKey) {
    case 'cloud':
      return <Cloud {...props} />;
    case 'code':
      return <Code2 {...props} />;
    case 'cpu':
      return <Cpu {...props} />;
    case 'shield':
      return <ShieldCheck {...props} />;
    case 'database':
      return <Database {...props} />;
    default:
      return <Layers {...props} />;
  }
}

export function LivePreview({
  config,
  validation,
  viewport,
  onSelectViewport,
  onInspectXml,
}: LivePreviewProps) {
  const [pageMode, setPageMode] = useState<PreviewPage>('homepage');
  const [activePostId, setActivePostId] = useState<string>(
    config.insights[0]?.id || 'post-multi-region'
  );
  const [selectedLabel, setSelectedLabel] = useState<string>('ALL');
  const [blogSearchQuery, setBlogSearchQuery] = useState<string>('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<CaseStudyItem | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  const [copiedPostLink, setCopiedPostLink] = useState(false);
  const [showResponsiveOverlay, setShowResponsiveOverlay] = useState(true);
  const [showColumnGuides, setShowColumnGuides] = useState(false);
  const [measuredWidthPx, setMeasuredWidthPx] = useState<number>(0);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);

  // Measure live rendered width of the preview frame for accurate breakpoint telemetry
  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;

    const updateWidth = () => {
      setMeasuredWidthPx(Math.round(el.getBoundingClientRect().width));
    };
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredWidthPx(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport]);

  // Newsletter form state
  const [newsEmail, setNewsEmail] = useState('');
  const [newsHoneypot, setNewsHoneypot] = useState('');
  const [newsStatus, setNewsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newsMsg, setNewsMsg] = useState('');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactHoneypot, setContactHoneypot] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contactMsg, setContactMsg] = useState('');

  const { skin } = config;
  const activeProfile = config.responsive[viewport];
  const activeBreakpointSpec = BREAKPOINT_SPECS[viewport];

  const activePostIndex = Math.max(
    0,
    config.insights.findIndex((p) => p.id === activePostId)
  );
  const activePost = config.insights[activePostIndex] || config.insights[0];
  const prevPost = activePostIndex > 0 ? config.insights[activePostIndex - 1] : null;
  const nextPost =
    activePostIndex < config.insights.length - 1
      ? config.insights[activePostIndex + 1]
      : null;

  // Strictly 3-6 posts on Homepage per Blogger Settings
  const homepagePosts = useMemo(
    () => config.insights.slice(0, config.homepageBlogLimit),
    [config.insights, config.homepageBlogLimit]
  );

  // Aggregated Topic Labels (Exclusively rendered on the separate All Blogs Page)
  const blogLabelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of config.insights) {
      const unique = new Set<string>([post.category, ...(post.tags || [])]);
      unique.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [config.insights]);

  const filteredBlogs = useMemo(() => {
    const q = blogSearchQuery.trim().toLowerCase();
    return config.insights.filter((post) => {
      const matchesLabel =
        selectedLabel === 'ALL' ||
        post.category === selectedLabel ||
        (post.tags || []).includes(selectedLabel);
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.author.toLowerCase().includes(q) ||
        (post.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchesLabel && matchesQuery;
    });
  }, [config.insights, selectedLabel, blogSearchQuery]);

  const resolveMediaSrc = (svgKind: SvgGraphicKind, webpUrl: string) =>
    config.imageDeliveryMode === 'inline-svg'
      ? buildCc0ArchitecturalSvgUri(
          svgKind,
          skin.primaryBrandColor,
          skin.accentColor
        )
      : webpUrl;

  const mediaPayloadLabel =
    config.imageDeliveryMode === 'inline-svg'
      ? `${getCc0SvgBundleSizeKb(skin.primaryBrandColor, skin.accentColor)} KB CC0 SVG`
      : `${WEBP_ASSET_SIZES_KB.total} KB WebP`;

  const viewportWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px]'
      : viewport === 'tablet'
      ? 'max-w-[820px]'
      : 'max-w-[1240px]';

  const responsiveGridClass =
    activeProfile.gridColumns === 1
      ? 'grid-cols-1'
      : activeProfile.gridColumns === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  const sectionPadClass = activeProfile.compactPadding
    ? 'px-4 py-8'
    : 'px-6 py-14';

  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newsHoneypot.trim().length > 0) {
      setNewsStatus('error');
      setNewsMsg('Automated bot submission blocked by honeypot field.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsEmail.trim())) {
      setNewsStatus('error');
      setNewsMsg('Please enter a valid work email address.');
      return;
    }
    setNewsStatus('success');
    setNewsMsg(
      `Subscribed ${newsEmail.trim()} via ${config.newsletterProvider} workflow.`
    );
    setNewsEmail('');
  };

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (contactHoneypot.trim().length > 0) {
      setContactStatus('error');
      setContactMsg('Spam trap triggered. Inquiry discarded.');
      return;
    }
    if (!contactName.trim() || !contactMessage.trim()) {
      setContactStatus('error');
      setContactMsg('Please complete your name and project scope.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setContactStatus('error');
      setContactMsg('Please provide a valid work email address.');
      return;
    }
    setContactStatus('success');
    setContactMsg(
      `Inquiry received for ${contactName.trim()}. Native Blogger anti-spam check passed.`
    );
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  const handleCopyArticleUrl = async () => {
    const url = `${config.domain}/2026/11/${activePost.slug}.html`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPostLink(true);
      setTimeout(() => setCopiedPostLink(false), 2000);
    } catch {
      setCopiedPostLink(false);
    }
  };

  const openArticle = (postId: string) => {
    setActivePostId(postId);
    setOpenFaqIndex(0);
    setMobileDrawerOpen(false);
    setPageMode('post');
  };

  const openBlogsPage = (label: string = 'ALL') => {
    setSelectedLabel(label);
    setMobileDrawerOpen(false);
    setPageMode('blogs');
  };

  const navigateHomeSection = () => {
    setMobileDrawerOpen(false);
    setPageMode('homepage');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Studio Preview Controls Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Template view mode"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={pageMode === 'homepage'}
              onClick={() => setPageMode('homepage')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                pageMode === 'homepage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Homepage ({config.homepageBlogLimit} Blogs)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageMode === 'blogs'}
              onClick={() => setPageMode('blogs')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                pageMode === 'blogs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Blogs Page ({config.insights.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageMode === 'post'}
              onClick={() => setPageMode('post')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                pageMode === 'post'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Post
            </button>
          </div>

          <div
            role="group"
            aria-label="Preview viewport device"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md border border-slate-200"
          >
            {(
              [
                { id: 'desktop', label: 'Desktop', icon: Monitor },
                { id: 'tablet', label: 'Tablet', icon: Tablet },
                { id: 'mobile', label: 'Mobile', icon: Smartphone },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelectViewport(id);
                  setMobileDrawerOpen(false);
                }}
                title={`${label} viewport`}
                aria-label={`${label} viewport`}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  viewport === id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={showResponsiveOverlay}
            onClick={() => setShowResponsiveOverlay((open) => !open)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showResponsiveOverlay
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title="Toggle Responsive Testing overlay"
          >
            <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Responsive Overlay</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>{validation.wellFormed ? 'XML Valid' : 'XML Needs Review'}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{mediaPayloadLabel}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onInspectXml}
            className="text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
          >
            Inspect {validation.lineCount} XML lines
          </button>
        </div>
      </div>

      {/* Rendered Blogger Template Canvas + Floating Responsive Testing Overlay */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 bg-slate-100">
          {showResponsiveOverlay && (
            <div
              aria-label="Active viewport breakpoint ruler"
              className={`mx-auto mb-2.5 px-3 py-1.5 rounded-md bg-slate-900 text-slate-200 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] transition-[max-width] duration-200 ${viewportWidthClass}`}
            >
              <div className="flex items-center gap-2 min-w-0 tabular-nums">
                <span className="font-semibold text-white whitespace-nowrap shrink-0">
                  {activeBreakpointSpec.label}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-mono text-sky-300 whitespace-nowrap shrink-0">
                  {measuredWidthPx > 0 ? measuredWidthPx : activeBreakpointSpec.targetWidthPx}px
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-slate-600">
                  ·
                </span>
                <span className="hidden sm:inline font-mono text-slate-400 truncate">
                  {activeBreakpointSpec.rangeLabel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                {BREAKPOINT_ORDER.map((bp) => {
                  const spec = BREAKPOINT_SPECS[bp];
                  const isCurrent = viewport === bp;
                  return (
                    <button
                      key={bp}
                      type="button"
                      onClick={() => {
                        onSelectViewport(bp);
                        setMobileDrawerOpen(false);
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {spec.targetWidthPx}px
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div
            ref={previewFrameRef}
            className={`relative mx-auto transition-[max-width] duration-200 border border-slate-200 rounded-lg overflow-hidden shadow-xs ${viewportWidthClass}`}
            style={
              {
                backgroundColor: skin.mainBgColor,
                color: skin.textColor,
                fontFamily: `'${skin.bodyFont}', system-ui, sans-serif`,
                '--main-bg': skin.mainBgColor,
                '--brand-primary': skin.primaryBrandColor,
                '--brand-secondary': skin.secondaryColor,
                '--brand-accent': skin.accentColor,
                '--text-main': skin.textColor,
              } as CSSProperties
            }
          >
            {showResponsiveOverlay && showColumnGuides && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 px-4 sm:px-6"
              >
                <div
                  className={`max-w-[1140px] mx-auto h-full grid gap-6 ${responsiveGridClass}`}
                >
                  {Array.from({ length: activeProfile.gridColumns }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-full bg-sky-500/8 border-x border-dashed border-sky-500/35"
                    />
                  ))}
                </div>
              </div>
            )}
          {/* Sticky Glassmorphic Blogger Header (Header1 + PageList1 + Responsive Drawer) */}
          <header
            className={`sticky top-0 z-20 border-b backdrop-blur-md ${
              viewport === 'mobile' ? 'px-4' : 'px-6'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              borderColor: 'rgba(15, 23, 42, 0.09)',
            }}
          >
            <div
              className={`max-w-[1140px] mx-auto flex items-center justify-between gap-4 ${
                viewport === 'mobile' ? 'h-14' : 'h-16'
              }`}
            >
              <button
                type="button"
                onClick={navigateHomeSection}
                className="text-sm sm:text-base font-bold tracking-tight whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  color: skin.primaryBrandColor,
                  fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                }}
              >
                {config.companyName}
              </button>

              {activeProfile.navigationStyle === 'inline' && (
                <nav
                  aria-label="Preview site navigation"
                  className="flex items-center gap-5 text-sm font-medium overflow-x-auto"
                >
                  <a
                    href="#preview-services"
                    onClick={navigateHomeSection}
                    className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    Capabilities
                  </a>
                  <a
                    href="#preview-projects"
                    onClick={navigateHomeSection}
                    className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    Case Studies
                  </a>
                  <a
                    href="#preview-testimonials"
                    onClick={navigateHomeSection}
                    className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    Reviews
                  </a>
                  <button
                    type="button"
                    onClick={() => openBlogsPage('ALL')}
                    className={`hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer ${
                      pageMode === 'blogs' || pageMode === 'post'
                        ? 'text-slate-950 font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    Blogs
                  </button>
                </nav>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {viewport !== 'mobile' && (
                  <a
                    href="#preview-footer"
                    className="px-4 py-2 text-xs font-semibold text-white rounded-md transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: skin.accentColor }}
                  >
                    Schedule Review
                  </a>
                )}

                {activeProfile.navigationStyle === 'drawer' && (
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen((open) => !open)}
                    aria-expanded={mobileDrawerOpen}
                    aria-label="Toggle navigation drawer"
                    className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    {mobileDrawerOpen ? (
                      <X className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Menu className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {activeProfile.navigationStyle === 'drawer' && mobileDrawerOpen && (
              <nav
                aria-label="Mobile and Tablet navigation drawer"
                className="border-t border-slate-200 py-2 space-y-0.5 bg-white"
              >
                <button
                  type="button"
                  onClick={navigateHomeSection}
                  className="w-full text-left px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded cursor-pointer"
                >
                  Home
                </button>
                <a
                  href="#preview-services"
                  onClick={navigateHomeSection}
                  className="block px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded"
                >
                  Capabilities
                </a>
                <a
                  href="#preview-projects"
                  onClick={navigateHomeSection}
                  className="block px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded"
                >
                  Case Studies
                </a>
                <a
                  href="#preview-testimonials"
                  onClick={navigateHomeSection}
                  className="block px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded"
                >
                  Reviews
                </a>
                <button
                  type="button"
                  onClick={() => openBlogsPage('ALL')}
                  className="w-full text-left px-2 py-2.5 text-sm font-semibold rounded cursor-pointer"
                  style={{ color: skin.accentColor }}
                >
                  All Blogs ({config.insights.length})
                </button>
                <a
                  href="#preview-footer"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="block mt-2 text-center px-4 py-2.5 text-xs font-semibold text-white rounded-md"
                  style={{ backgroundColor: skin.accentColor }}
                >
                  Schedule Review
                </a>
              </nav>
            )}
          </header>

          {pageMode === 'homepage' && (
            <div>
              {/* 1. Hero Section (ezible-hero) */}
              <section
                className={`${sectionPadClass} border-b`}
                style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}
              >
                <div
                  className={`max-w-[1140px] mx-auto grid gap-8 items-stretch ${
                    viewport === 'desktop' && activeProfile.showHeroMedia
                      ? 'grid-cols-12'
                      : 'grid-cols-1'
                  }`}
                >
                  <div
                    className={`${
                      viewport === 'desktop' && activeProfile.showHeroMedia
                        ? 'col-span-6'
                        : 'col-span-1'
                    } flex flex-col justify-center space-y-5`}
                  >
                    <div
                      className="text-xs font-semibold tracking-wide"
                      style={{ color: skin.secondaryColor }}
                    >
                      {config.areaServed}
                    </div>
                    <h1
                      className={`font-bold tracking-tight leading-[1.14] ${
                        viewport === 'mobile' ? 'text-2xl' : 'text-3xl sm:text-4xl'
                      }`}
                      style={{
                        color: skin.primaryBrandColor,
                        fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        textWrap: 'balance',
                      }}
                    >
                      {config.heroHeadline}
                    </h1>
                    <p className="text-[15px] leading-relaxed text-slate-600 max-w-[54ch]">
                      {config.heroSubheadline}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href="#preview-footer"
                        className="px-5 py-2.5 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
                        style={{ backgroundColor: skin.accentColor }}
                      >
                        {config.heroPrimaryCta}
                      </a>
                      <a
                        href="#preview-projects"
                        className="px-5 py-2.5 text-sm font-semibold bg-white border rounded-md transition-opacity hover:opacity-85 whitespace-nowrap shrink-0"
                        style={{
                          color: skin.secondaryColor,
                          borderColor: skin.secondaryColor,
                        }}
                      >
                        {config.heroSecondaryCta}
                      </a>
                    </div>
                  </div>

                  {activeProfile.showHeroMedia && (
                    <div
                      className={
                        viewport === 'desktop' ? 'col-span-6' : 'col-span-1'
                      }
                    >
                      <div className="h-full min-h-[220px] rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                        <img
                          src={resolveMediaSrc('hero', TEMPLATE_IMAGES.hero)}
                          alt="EZIBLE IT SOLUTIONS enterprise architecture studio"
                          width={960}
                          height={540}
                          decoding="async"
                          fetchPriority="high"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Dedicated Device-Specific Blogger Layout Widget Zone (Desktop / Tablet / Mobile) */}
              {activeProfile.customWidgetEnabled && (
                <section
                  aria-label={`${viewport} custom widget zone`}
                  className={`${
                    activeProfile.compactPadding ? 'px-4 py-5' : 'px-6 py-6'
                  } border-b`}
                  style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}
                >
                  <div
                    className="max-w-[1140px] mx-auto bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4"
                    style={{ borderLeftWidth: '3px', borderLeftColor: skin.secondaryColor }}
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div
                        className="text-[11px] font-mono font-medium"
                        style={{ color: skin.secondaryColor }}
                      >
                        ezible-{viewport}-widgets
                      </div>
                      <h2
                        className="text-base font-bold"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        {activeProfile.customWidgetTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {activeProfile.customWidgetBody}
                      </p>
                    </div>
                    <a
                      href="#preview-footer"
                      className="px-4 py-2 text-xs font-semibold text-white rounded-md whitespace-nowrap shrink-0"
                      style={{ backgroundColor: skin.accentColor }}
                    >
                      {viewport === 'mobile' ? 'Request Callback' : 'Schedule Review'}
                    </a>
                  </div>
                </section>
              )}

              {/* 2. Core Engineering Capabilities (ezible-services) */}
              {activeProfile.showServices && (
                <section
                  id="preview-services"
                  className={`${sectionPadClass} border-b`}
                  style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="max-w-[1140px] mx-auto space-y-8">
                    <div className="max-w-2xl">
                      <h2
                        className="text-2xl sm:text-3xl font-bold tracking-tight"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Core Engineering Capabilities
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Modular HTML widgets inside Blogger Layout with independent Desktop, Tablet, and Mobile visibility.
                      </p>
                    </div>

                    <div className={`grid gap-6 ${responsiveGridClass}`}>
                      {config.services.map((svc) => (
                        <div
                          key={svc.id}
                          className="bg-white border border-slate-200/90 rounded-lg p-6 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span
                                className="text-xs font-mono font-semibold tabular-nums"
                                style={{ color: skin.secondaryColor }}
                              >
                                {svc.index}
                              </span>
                              <ServiceIcon
                                iconKey={svc.iconKey}
                                color={skin.accentColor}
                              />
                            </div>
                            <h3
                              className="text-base font-bold"
                              style={{
                                color: skin.primaryBrandColor,
                                fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                              }}
                            >
                              {svc.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-600">
                              {svc.summary}
                            </p>
                          </div>
                          <div className="pt-3 border-t border-slate-100 text-xs font-medium text-slate-800 tabular-nums">
                            {svc.deliverable}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 3. Projects & Case Studies (ezible-projects + Lightbox) */}
              {activeProfile.showCaseStudies && (
                <section
                  id="preview-projects"
                  className={`${sectionPadClass} border-b`}
                  style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="max-w-[1140px] mx-auto space-y-8">
                    <div className="max-w-2xl">
                      <h2
                        className="text-2xl sm:text-3xl font-bold tracking-tight"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Projects &amp; Case Studies
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Quantified delivery outcomes across cloud infrastructure, workflow automation, and security engineering.
                      </p>
                    </div>

                    <div className={`grid gap-6 ${responsiveGridClass}`}>
                      {config.caseStudies.map((cs) => (
                        <article
                          key={cs.id}
                          className="bg-white border border-slate-200/90 rounded-lg overflow-hidden flex flex-col"
                        >
                          <button
                            type="button"
                            onClick={() => setLightboxItem(cs)}
                            className="group relative block aspect-[4/3] w-full overflow-hidden bg-slate-900 cursor-zoom-in text-left"
                            aria-label={`Open gallery lightbox for ${cs.title}`}
                          >
                            <img
                              src={resolveMediaSrc(cs.svgKind, cs.imageUrl)}
                              alt={cs.imageAlt}
                              width={800}
                              height={600}
                              decoding="async"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                            <span className="absolute bottom-3 right-3 p-1.5 rounded bg-slate-950/75 text-white opacity-90 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </span>
                          </button>

                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className="font-medium"
                                  style={{ color: skin.secondaryColor }}
                                >
                                  {cs.client}
                                </span>
                                <span aria-hidden="true" className="text-slate-400">·</span>
                                <span className="text-slate-500">{cs.sector}</span>
                              </div>
                              <h3
                                className="text-base font-bold leading-snug"
                                style={{
                                  color: skin.primaryBrandColor,
                                  fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                                }}
                              >
                                {cs.title}
                              </h3>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {cs.summary}
                              </p>
                            </div>

                            <div className="space-y-2 pt-3 border-t border-slate-100">
                              <div
                                className="text-xs font-semibold tabular-nums"
                                style={{ color: skin.accentColor }}
                              >
                                {cs.outcome}
                              </div>
                              <div className="text-xs text-slate-500">
                                {cs.stack.join(' / ')}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 4. Client Testimonials (ezible-testimonials + Review Schema) */}
              {activeProfile.showTestimonials && (
                <section
                  id="preview-testimonials"
                  className={`${sectionPadClass} border-b`}
                  style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="max-w-[1140px] mx-auto space-y-8">
                    <div className="max-w-2xl">
                      <h2
                        className="text-2xl sm:text-3xl font-bold tracking-tight"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Client Outcomes &amp; Testimonials
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Structured with Schema.org Review microdata so search engines verify engineering leadership endorsements.
                      </p>
                    </div>

                    <div className={`grid gap-6 ${responsiveGridClass}`}>
                      {config.testimonials.map((t) => (
                        <figure
                          key={t.id}
                          className="bg-white border border-slate-200/90 rounded-lg p-6 flex flex-col justify-between gap-5"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span
                                className="inline-flex items-center gap-0.5 text-amber-500"
                                aria-label={`${t.rating} out of 5 stars`}
                              >
                                {Array.from({ length: t.rating }).map((_, idx) => (
                                  <Star
                                    key={idx}
                                    className="w-3.5 h-3.5 fill-current"
                                    aria-hidden="true"
                                  />
                                ))}
                              </span>
                              <span className="font-medium text-slate-700 tabular-nums">
                                {t.verifiedMetric}
                              </span>
                            </div>
                            <blockquote className="text-sm leading-relaxed text-slate-700">
                              &ldquo;{t.quote}&rdquo;
                            </blockquote>
                          </div>

                          <figcaption className="pt-3 border-t border-slate-100 text-xs">
                            <div
                              className="font-semibold"
                              style={{ color: skin.primaryBrandColor }}
                            >
                              {t.author}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              {t.role}, {t.organization}
                            </div>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 5. Curated Homepage Blogs (Strictly 3–6 Posts, ZERO Tags/Labels Here) */}
              {activeProfile.showHomeBlogs && (
                <section id="preview-insights" className={sectionPadClass}>
                  <div className="max-w-[1140px] mx-auto space-y-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="max-w-2xl">
                        <h2
                          className="text-2xl sm:text-3xl font-bold tracking-tight"
                          style={{
                            color: skin.primaryBrandColor,
                            fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                          }}
                        >
                          Latest Tech Insights
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 tabular-nums">
                          Showing {homepagePosts.length} recent blogs configured via Blogger Settings (3–6). Topic labels and full archive live on the dedicated Blogs page.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openBlogsPage('ALL')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-md hover:border-slate-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        style={{ color: skin.primaryBrandColor }}
                      >
                        <span>View All Blogs ({config.insights.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className={`grid gap-6 ${responsiveGridClass}`}>
                      {homepagePosts.map((post) => (
                        <article
                          key={post.id}
                          className="bg-white border border-slate-200/90 rounded-lg overflow-hidden flex flex-col"
                        >
                          <button
                            type="button"
                            onClick={() => openArticle(post.id)}
                            className="block aspect-[4/3] w-full overflow-hidden bg-slate-900 cursor-pointer"
                          >
                            <img
                              src={resolveMediaSrc(post.svgKind, post.imageUrl)}
                              alt={post.imageAlt}
                              width={800}
                              height={600}
                              decoding="async"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-200"
                            />
                          </button>
                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="space-y-2.5">
                              {/* Zero tags/labels on homepage cards */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                                <span>{post.publishedDate}</span>
                                <span aria-hidden="true">·</span>
                                <span>{post.readMinutes} min read</span>
                              </div>
                              <h3
                                className="text-base font-bold leading-snug"
                                style={{
                                  color: skin.primaryBrandColor,
                                  fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => openArticle(post.id)}
                                  className="text-left hover:underline underline-offset-4 cursor-pointer"
                                >
                                  {post.title}
                                </button>
                              </h3>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {post.excerpt}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openArticle(post.id)}
                              className="self-start inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-4 cursor-pointer"
                              style={{ color: skin.accentColor }}
                            >
                              <span>Read Article</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {pageMode === 'blogs' && (
            /* SEPARATE ALL-BLOGS ARCHIVE PAGE (Dynamic Full List + Scoped Tags/Labels + Search) */
            <div className={sectionPadClass}>
              <div className="max-w-[1140px] mx-auto space-y-8">
                <div className="space-y-4">
                  <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1.5 text-xs text-slate-500"
                  >
                    <button
                      type="button"
                      onClick={navigateHomeSection}
                      className="hover:underline cursor-pointer"
                    >
                      Home
                    </button>
                    <span aria-hidden="true">/</span>
                    <span className="text-slate-900 font-medium">
                      Blogs ({config.blogsPagePath})
                    </span>
                  </nav>

                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-2xl space-y-1.5">
                      <h1
                        className="text-2xl sm:text-4xl font-bold tracking-tight"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        {selectedLabel === 'ALL'
                          ? 'All Tech Insights & Engineering Blogs'
                          : `Topic: ${selectedLabel}`}
                      </h1>
                      <p className="text-sm text-slate-600">
                        Dedicated archive page listing every published post dynamically. Topic tags and label filters are scoped exclusively here.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search
                        className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={blogSearchQuery}
                        onChange={(e) => setBlogSearchQuery(e.target.value)}
                        placeholder="Filter blogs by keyword..."
                        aria-label="Filter blogs by keyword"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Scoped Label1 Tag Filter Bar (Exclusively on Separate Blogs Page) */}
                <section
                  aria-label="Filter blogs by topic label"
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Topics &amp; Labels (Label1 Widget)
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {filteredBlogs.length} of {config.insights.length} posts
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedLabel('ALL')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                        selectedLabel === 'ALL'
                          ? 'text-white border-transparent'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                      style={
                        selectedLabel === 'ALL'
                          ? { backgroundColor: skin.accentColor }
                          : undefined
                      }
                    >
                      All Blogs ({config.insights.length})
                    </button>
                    {blogLabelCounts.map(([label, count]) => {
                      const active = selectedLabel === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setSelectedLabel(label)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                            active
                              ? 'text-white border-transparent'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                          style={
                            active
                              ? { backgroundColor: skin.accentColor }
                              : undefined
                          }
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* All Matching Blogs Grid */}
                {filteredBlogs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
                    <p className="text-sm text-slate-600">
                      No blog posts matched your current topic or search filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLabel('ALL');
                        setBlogSearchQuery('');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white rounded-md cursor-pointer"
                      style={{ backgroundColor: skin.accentColor }}
                    >
                      Reset Blog Filters
                    </button>
                  </div>
                ) : (
                  <div className={`grid gap-6 ${responsiveGridClass}`}>
                    {filteredBlogs.map((post) => (
                      <article
                        key={post.id}
                        className="bg-white border border-slate-200/90 rounded-lg overflow-hidden flex flex-col"
                      >
                        <button
                          type="button"
                          onClick={() => openArticle(post.id)}
                          className="block aspect-[4/3] w-full overflow-hidden bg-slate-900 cursor-pointer"
                        >
                          <img
                            src={resolveMediaSrc(post.svgKind, post.imageUrl)}
                            alt={post.imageAlt}
                            width={800}
                            height={600}
                            decoding="async"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-200"
                          />
                        </button>
                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                              <button
                                type="button"
                                onClick={() => setSelectedLabel(post.category)}
                                className="font-medium hover:underline cursor-pointer"
                                style={{ color: skin.accentColor }}
                              >
                                {post.category}
                              </button>
                              <span aria-hidden="true">·</span>
                              <span>{post.publishedDate}</span>
                              <span aria-hidden="true">·</span>
                              <span>{post.readMinutes} min read</span>
                            </div>
                            <h2
                              className="text-base font-bold leading-snug"
                              style={{
                                color: skin.primaryBrandColor,
                                fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => openArticle(post.id)}
                                className="text-left hover:underline underline-offset-4 cursor-pointer"
                              >
                                {post.title}
                              </button>
                            </h2>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="space-y-2.5 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              {(post.tags || []).map((tag, idx) => (
                                <span key={tag} className="inline-flex items-center gap-1.5">
                                  {idx > 0 && <span aria-hidden="true">/</span>}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLabel(tag)}
                                    className="hover:text-slate-900 hover:underline cursor-pointer"
                                  >
                                    {tag}
                                  </button>
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => openArticle(post.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-4 cursor-pointer"
                              style={{ color: skin.accentColor }}
                            >
                              <span>Read Full Article</span>
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {pageMode === 'post' && (
            /* DYNAMIC SINGLE BLOG POST PAGE */
            <div className={activeProfile.compactPadding ? 'px-4 py-8' : 'px-6 py-10'}>
              <div className="max-w-[780px] mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => openBlogsPage('ALL')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Back to All Blogs</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Dynamic post:</span>
                    <select
                      aria-label="Select preview article"
                      value={activePost.id}
                      onChange={(e) => {
                        setActivePostId(e.target.value);
                        setOpenFaqIndex(0);
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs max-w-[240px]"
                    >
                      {config.insights.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* BreadcrumbList semantic nav */}
                <nav
                  aria-label="Breadcrumb"
                  className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"
                >
                  <button
                    type="button"
                    onClick={navigateHomeSection}
                    className="hover:underline cursor-pointer"
                  >
                    Home
                  </button>
                  <span aria-hidden="true">/</span>
                  <button
                    type="button"
                    onClick={() => openBlogsPage('ALL')}
                    className="hover:underline cursor-pointer"
                  >
                    Blogs
                  </button>
                  <span aria-hidden="true">/</span>
                  <span className="text-slate-800 truncate max-w-[280px]">
                    {activePost.title}
                  </span>
                </nav>

                <article className="space-y-8">
                  <header className="space-y-4">
                    <h1
                      className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight"
                      style={{
                        color: skin.primaryBrandColor,
                        fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        textWrap: 'balance',
                      }}
                    >
                      {activePost.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                      <span className="font-medium text-slate-800">
                        {activePost.author}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activePost.publishedDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activePost.readMinutes} min read</span>
                    </div>
                  </header>

                  {/* AEO Highlighted Key Takeaways / TL;DR Box (.aeo-tldr-box) */}
                  <section
                    aria-label="Key Takeaways"
                    className="bg-white border border-slate-200 rounded-lg p-6 space-y-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: skin.secondaryColor }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="text-sm font-bold"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Key Takeaways / TL;DR
                      </h2>
                      <span
                        className="font-mono text-[11px] font-medium"
                        style={{ color: skin.secondaryColor }}
                      >
                        .aeo-tldr-box
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {activePost.tldrSummary}
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
                      {activePost.tldrBullets.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <div className="aspect-[16/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={resolveMediaSrc(activePost.svgKind, activePost.imageUrl)}
                      alt={activePost.imageAlt}
                      width={800}
                      height={600}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Semantic H2/H3 Post Sections */}
                  <div className="space-y-6">
                    {activePost.sections.map((sec, idx) => (
                      <section key={idx} className="space-y-3">
                        <h2
                          className="text-xl font-bold"
                          style={{
                            color: skin.primaryBrandColor,
                            fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                          }}
                        >
                          {sec.heading}
                        </h2>
                        <p className="text-[15px] leading-relaxed text-slate-700">
                          {sec.body}
                        </p>
                        {sec.subHeading && (
                          <div className="pt-2 space-y-2">
                            <h3
                              className="text-base font-bold"
                              style={{
                                color: skin.primaryBrandColor,
                                fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                              }}
                            >
                              {sec.subHeading}
                            </h3>
                            <p className="text-[15px] leading-relaxed text-slate-700">
                              {sec.subBody}
                            </p>
                          </div>
                        )}
                      </section>
                    ))}
                  </div>

                  {/* GEO Comparison Table (.geo-spec-table) */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Architecture Benchmark Matrix
                      </h2>
                      <span className="font-mono text-[11px] text-slate-400">
                        .geo-spec-table
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm tabular-nums">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                              <th className="py-3 px-4 font-semibold">Metric</th>
                              <th className="py-3 px-4 font-semibold">Legacy Pattern</th>
                              <th className="py-3 px-4 font-semibold">EZIBLE Architecture</th>
                              <th className="py-3 px-4 font-semibold">Measured Delta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activePost.specTable.map((row, idx) => (
                              <tr key={idx}>
                                <td className="py-3 px-4 font-medium text-slate-900">
                                  {row.criterion}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {row.legacyApproach}
                                </td>
                                <td className="py-3 px-4 text-slate-900 font-medium">
                                  {row.ezibleArchitecture}
                                </td>
                                <td
                                  className="py-3 px-4 font-semibold"
                                  style={{ color: skin.accentColor }}
                                >
                                  {row.measuredDelta}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  {/* FAQ Accordion (.faq-accordion matching FAQPage JSON-LD) */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{
                          color: skin.primaryBrandColor,
                          fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                        }}
                      >
                        Frequently Asked Questions
                      </h2>
                      <span className="font-mono text-[11px] text-slate-400">
                        .faq-accordion
                      </span>
                    </div>
                    <div className="space-y-2">
                      {activePost.faqs.map((faq, idx) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-md overflow-hidden"
                          >
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setOpenFaqIndex(isOpen ? -1 : idx)
                              }
                              className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 text-sm font-semibold cursor-pointer"
                              style={{ color: skin.primaryBrandColor }}
                            >
                              <span>{faq.question}</span>
                              <ChevronDown
                                className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Zero-Dependency SVG Social Share Bar */}
                  <div className="flex flex-wrap items-center gap-2.5 py-5 border-y border-slate-200">
                    <span
                      className="text-xs font-semibold mr-1"
                      style={{ color: skin.primaryBrandColor }}
                    >
                      Share Brief:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyArticleUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded hover:border-slate-400 cursor-pointer"
                      style={{ color: skin.primaryBrandColor }}
                    >
                      {copiedPostLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{copiedPostLink ? 'Copied URL' : 'Copy Canonical Link'}</span>
                    </button>
                  </div>

                  {/* Dynamic Post-to-Post Navigation */}
                  <nav
                    aria-label="Adjacent blog posts"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2"
                  >
                    {prevPost ? (
                      <button
                        type="button"
                        onClick={() => openArticle(prevPost.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md hover:border-slate-400 cursor-pointer max-w-[260px] truncate"
                        style={{ color: skin.primaryBrandColor }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{prevPost.title}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBlogsPage('ALL')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md hover:border-slate-400 cursor-pointer"
                        style={{ color: skin.primaryBrandColor }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>All Blogs</span>
                      </button>
                    )}

                    {nextPost && (
                      <button
                        type="button"
                        onClick={() => openArticle(nextPost.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-md hover:border-slate-400 cursor-pointer max-w-[260px] truncate"
                        style={{ color: skin.primaryBrandColor }}
                      >
                        <span className="truncate">{nextPost.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    )}
                  </nav>
                </article>
              </div>
            </div>
          )}

          {/* Footer: Newsletter Automation + Native Anti-Spam ContactForm1 (Device Managed) */}
          <footer
            id="preview-footer"
            className={`${sectionPadClass} text-slate-200`}
            style={{ backgroundColor: skin.primaryBrandColor }}
          >
            <div className="max-w-[1140px] mx-auto space-y-10">
              {activeProfile.showNewsletterWidget && (
                <div className="p-6 rounded-lg border border-white/15 flex flex-wrap items-center justify-between gap-6">
                  <div className="space-y-1 max-w-md">
                    <h2
                      className="text-lg font-bold text-white"
                      style={{
                        fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                      }}
                    >
                      Monthly Architecture &amp; Security Dispatch
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Delivered via {config.newsletterProvider} automation. Zero fluff, unsubscribe anytime.
                    </p>
                  </div>

                  <form
                    onSubmit={handleNewsletterSubmit}
                    className="flex flex-wrap items-center gap-2.5 flex-1 max-w-md"
                  >
                    <input
                      type="text"
                      name="company_website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      value={newsHoneypot}
                      onChange={(e) => setNewsHoneypot(e.target.value)}
                      className="sr-only"
                    />
                    <input
                      type="email"
                      required
                      value={newsEmail}
                      onChange={(e) => setNewsEmail(e.target.value)}
                      placeholder="name@company.com"
                      aria-label="Work email for newsletter"
                      className="flex-1 min-w-[200px] px-3.5 py-2.5 text-sm text-white placeholder-slate-400 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 text-sm font-semibold text-white rounded-md cursor-pointer whitespace-nowrap"
                      style={{ backgroundColor: skin.accentColor }}
                    >
                      Subscribe
                    </button>
                    {newsStatus !== 'idle' && (
                      <p
                        className={`w-full text-xs ${
                          newsStatus === 'success'
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {newsMsg}
                      </p>
                    )}
                  </form>
                </div>
              )}

              <div
                className={`grid gap-10 ${
                  viewport === 'desktop' && activeProfile.showContactWidget
                    ? 'grid-cols-12'
                    : 'grid-cols-1'
                }`}
              >
                <div
                  className={`${
                    viewport === 'desktop' && activeProfile.showContactWidget
                      ? 'col-span-5'
                      : 'col-span-1'
                  } space-y-3`}
                >
                  <h3
                    className="text-lg font-bold text-white"
                    style={{
                      fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                    }}
                  >
                    {config.companyName}
                  </h3>
                  <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
                    {config.tagline}
                  </p>
                  <div className="text-xs text-slate-400 space-y-1 pt-2">
                    <div>Coverage: {config.areaServed}</div>
                    <div>Direct Desk: {config.contactEmail}</div>
                  </div>
                </div>

                {activeProfile.showContactWidget && (
                  <div
                    className={
                      viewport === 'desktop' ? 'col-span-7' : 'col-span-1'
                    }
                  >
                    <h3
                      className="text-base font-bold text-white mb-4"
                      style={{
                        fontFamily: `'${skin.headingFont}', system-ui, sans-serif`,
                      }}
                    >
                      Request Architecture Consultation
                    </h3>
                    <form
                      onSubmit={handleContactSubmit}
                      className={`grid gap-3.5 ${
                        viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'
                      }`}
                    >
                      <input
                        type="text"
                        name="ez_contact_hp"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        value={contactHoneypot}
                        onChange={(e) => setContactHoneypot(e.target.value)}
                        className="sr-only"
                      />
                      <div>
                        <label
                          htmlFor="preview-contact-name"
                          className="block text-xs text-slate-300 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="preview-contact-name"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Jane Rivera"
                          className="w-full px-3 py-2 text-sm text-white placeholder-slate-400 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="preview-contact-email"
                          className="block text-xs text-slate-300 mb-1"
                        >
                          Work Email
                        </label>
                        <input
                          id="preview-contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="jane@enterprise.com"
                          className="w-full px-3 py-2 text-sm text-white placeholder-slate-400 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-white"
                        />
                      </div>
                      <div className={viewport === 'mobile' ? '' : 'col-span-2'}>
                        <label
                          htmlFor="preview-contact-msg"
                          className="block text-xs text-slate-300 mb-1"
                        >
                          Project Scope &amp; Timeline
                        </label>
                        <textarea
                          id="preview-contact-msg"
                          rows={3}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Describe your infrastructure, custom software, or security goals..."
                          className="w-full px-3 py-2 text-sm text-white placeholder-slate-400 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-white"
                        />
                      </div>
                      <div
                        className={`${
                          viewport === 'mobile' ? '' : 'col-span-2'
                        } flex flex-wrap items-center gap-3`}
                      >
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-semibold text-white rounded-md cursor-pointer"
                          style={{ backgroundColor: skin.accentColor }}
                        >
                          Send Inquiry
                        </button>
                        {contactStatus !== 'idle' && (
                          <span
                            className={`text-xs ${
                              contactStatus === 'success'
                                ? 'text-emerald-300'
                                : 'text-red-300'
                            }`}
                          >
                            {contactMsg}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  &copy; 2026 {config.companyName}. All rights reserved.
                </span>
                <span>
                  Blogger XML v3 · Responsive Desktop, Tablet &amp; Mobile Architecture
                </span>
              </div>
            </div>
          </footer>
          </div>
        </div>

        {showResponsiveOverlay && (
          <ResponsiveTestingOverlay
            viewport={viewport}
            measuredWidthPx={measuredWidthPx}
            activeProfile={activeProfile}
            showColumnGuides={showColumnGuides}
            onSelectViewport={(device) => {
              onSelectViewport(device);
              setMobileDrawerOpen(false);
            }}
            onToggleColumnGuides={() => setShowColumnGuides((v) => !v)}
            onClose={() => setShowResponsiveOverlay(false)}
          />
        )}
      </div>

      {/* Case Study Lightbox Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {lightboxItem.title}
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                aria-label="Close lightbox"
                className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center max-h-[65vh] overflow-hidden">
              <img
                src={resolveMediaSrc(lightboxItem.svgKind, lightboxItem.imageUrl)}
                alt={lightboxItem.imageAlt}
                width={800}
                height={600}
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full max-h-[65vh] object-contain"
              />
            </div>
            <div className="px-5 py-3.5 text-xs text-slate-600 leading-relaxed">
              {lightboxItem.galleryCaption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
