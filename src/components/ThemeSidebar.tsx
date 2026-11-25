import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileJson,
  History,
  Image as ImageIcon,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BodyFontOption,
  ConfigSnapshot,
  DeviceProfileKey,
  DeviceWidgetProfile,
  FaviconConfig,
  FaviconStyleOption,
  HeadingFontOption,
  HomepageBlogLimit,
  ImageDeliveryMode,
  NewsletterProvider,
  SiteConfig,
  ThemeSkinVariables,
} from '../types/template';
import {
  getCc0SvgBundleSizeKb,
  WEBP_ASSET_SIZES_KB,
} from '../lib/lightweightAssets';
import {
  bumpMinorVersion,
  formatSnapshotTimestamp,
  MAX_CONFIG_SNAPSHOTS,
  normalizeVersionTag,
} from '../lib/configHistory';
import {
  ImportedWorkspacePayload,
  MAX_WORKSPACE_IMPORT_BYTES,
  parseImportedWorkspaceJson,
} from '../lib/workspaceConfigIO';
import {
  buildBrandFaviconSvg,
  buildBrandFaviconSvgDataUri,
  extractBrandMonogram,
  isSafeHostedIconUrl,
  renderFaviconPngDataUri,
  STUDIO_GENERATED_ICON_URL,
} from '../lib/faviconGenerator';

interface ThemeSidebarProps {
  config: SiteConfig;
  snapshots: ConfigSnapshot[];
  activeDevice: DeviceProfileKey;
  onSelectDevice: (device: DeviceProfileKey) => void;
  onChangeConfig: (next: SiteConfig) => void;
  onResetDefaults: () => void;
  onSaveSnapshot: (label?: string, version?: string) => void;
  onRestoreSnapshot: (snapshot: ConfigSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearHistory: () => void;
  onExportWorkspaceJson: () => void;
  onImportWorkspace: (payload: ImportedWorkspacePayload) => void;
}

const HEADING_FONTS: HeadingFontOption[] = [
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
  'Bricolage Grotesque',
];

const BODY_FONTS: BodyFontOption[] = [
  'Public Sans',
  'DM Sans',
  'Plus Jakarta Sans',
  'Manrope',
];

const NEWSLETTER_PROVIDERS: NewsletterProvider[] = [
  'Brevo',
  'Mailchimp',
  'ConvertKit',
  'Custom Webhook',
];

const BLOG_LIMIT_OPTIONS: HomepageBlogLimit[] = [3, 4, 5, 6];

const DEVICE_META: Record<
  DeviceProfileKey,
  { label: string; range: string; sectionId: string }
> = {
  desktop: {
    label: 'Desktop',
    range: '>= 1025px',
    sectionId: 'ezible-desktop-widgets',
  },
  tablet: {
    label: 'Tablet',
    range: '641px – 1024px',
    sectionId: 'ezible-tablet-widgets',
  },
  mobile: {
    label: 'Mobile',
    range: '<= 640px',
    sectionId: 'ezible-mobile-widgets',
  },
};

const WIDGET_VISIBILITY_FIELDS: {
  key: keyof Pick<
    DeviceWidgetProfile,
    | 'showHeroMedia'
    | 'showServices'
    | 'showCaseStudies'
    | 'showTestimonials'
    | 'showHomeBlogs'
    | 'showNewsletterWidget'
    | 'showContactWidget'
  >;
  label: string;
  sectionTag: string;
}[] = [
  { key: 'showHeroMedia', label: 'Hero Visual Media', sectionTag: 'ezible-hero' },
  { key: 'showServices', label: 'Services Grid', sectionTag: 'ezible-services' },
  { key: 'showCaseStudies', label: 'Case Studies', sectionTag: 'ezible-projects' },
  { key: 'showTestimonials', label: 'Client Reviews', sectionTag: 'ezible-testimonials' },
  { key: 'showHomeBlogs', label: 'Homepage Blogs (3–6)', sectionTag: 'Blog1' },
  { key: 'showNewsletterWidget', label: 'Newsletter Bar', sectionTag: 'footer-newsletter' },
  { key: 'showContactWidget', label: 'Contact Form', sectionTag: 'ContactForm1' },
];

interface VisualColorPalette {
  id: string;
  name: string;
  skin: Pick<
    ThemeSkinVariables,
    'mainBgColor' | 'primaryBrandColor' | 'secondaryColor' | 'accentColor' | 'textColor'
  >;
}

const COLOR_PRESETS: VisualColorPalette[] = [
  {
    id: 'cobalt-slate',
    name: 'Cobalt Slate',
    skin: {
      mainBgColor: '#F8FAFC',
      primaryBrandColor: '#0F172A',
      secondaryColor: '#334155',
      accentColor: '#1D4ED8',
      textColor: '#1E293B',
    },
  },
  {
    id: 'nordic-steel',
    name: 'Nordic Steel',
    skin: {
      mainBgColor: '#F4F6F8',
      primaryBrandColor: '#111827',
      secondaryColor: '#0E7490',
      accentColor: '#0369A1',
      textColor: '#1F2937',
    },
  },
  {
    id: 'graphite-emerald',
    name: 'Graphite Emerald',
    skin: {
      mainBgColor: '#F8FAF9',
      primaryBrandColor: '#14191D',
      secondaryColor: '#0D9488',
      accentColor: '#0F766E',
      textColor: '#1E293B',
    },
  },
  {
    id: 'indigo-pulse',
    name: 'Indigo Pulse',
    skin: {
      mainBgColor: '#F8FAFC',
      primaryBrandColor: '#1E1B4B',
      secondaryColor: '#4338CA',
      accentColor: '#4F46E5',
      textColor: '#1E293B',
    },
  },
  {
    id: 'carbon-amber',
    name: 'Carbon Amber',
    skin: {
      mainBgColor: '#FAFAF9',
      primaryBrandColor: '#1C1917',
      secondaryColor: '#B45309',
      accentColor: '#D97706',
      textColor: '#292524',
    },
  },
  {
    id: 'obsidian-crimson',
    name: 'Obsidian Crimson',
    skin: {
      mainBgColor: '#FAFAFA',
      primaryBrandColor: '#18181B',
      secondaryColor: '#9F1239',
      accentColor: '#BE123C',
      textColor: '#27272A',
    },
  },
];

const PRIMARY_SWATCHES: { label: string; hex: string }[] = [
  { label: 'Deep Slate', hex: '#0F172A' },
  { label: 'Obsidian', hex: '#18181B' },
  { label: 'Midnight Navy', hex: '#172554' },
  { label: 'Deep Indigo', hex: '#1E1B4B' },
  { label: 'Forest Pine', hex: '#064E3B' },
  { label: 'Warm Charcoal', hex: '#1C1917' },
  { label: 'Dark Plum', hex: '#3B0764' },
  { label: 'Steel Ink', hex: '#111827' },
];

const SECONDARY_SWATCHES: { label: string; hex: string }[] = [
  { label: 'Slate Steel', hex: '#334155' },
  { label: 'Ocean Cyan', hex: '#0E7490' },
  { label: 'Teal Pulse', hex: '#0D9488' },
  { label: 'Royal Indigo', hex: '#4338CA' },
  { label: 'Cobalt Blue', hex: '#1D4ED8' },
  { label: 'Burnt Amber', hex: '#B45309' },
  { label: 'Crimson Rose', hex: '#9F1239' },
  { label: 'Emerald Depth', hex: '#047857' },
];

export function ThemeSidebar({
  config,
  snapshots,
  activeDevice,
  onSelectDevice,
  onChangeConfig,
  onResetDefaults,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClearHistory,
  onExportWorkspaceJson,
  onImportWorkspace,
}: ThemeSidebarProps) {
  const [sidebarTab, setSidebarTab] = useState<'design' | 'devices' | 'history'>('design');
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [faviconStatus, setFaviconStatus] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processWorkspaceFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isJsonType =
      lowerName.endsWith('.json') ||
      file.type === 'application/json' ||
      file.type === 'text/json';

    if (!isJsonType) {
      setImportFeedback({
        kind: 'error',
        message: 'Please select a .json studio config file.',
      });
      return;
    }

    if (file.size > MAX_WORKSPACE_IMPORT_BYTES) {
      setImportFeedback({
        kind: 'error',
        message: 'Config file exceeds the 2 MB maximum size limit.',
      });
      return;
    }

    try {
      const rawText = await file.text();
      const result = parseImportedWorkspaceJson(rawText);
      if (!result.ok) {
        setImportFeedback({
          kind: 'error',
          message: result.error,
        });
        return;
      }

      onImportWorkspace(result);
      setImportFeedback({
        kind: 'success',
        message: `${file.name} · ${result.summary}`,
      });
    } catch {
      setImportFeedback({
        kind: 'error',
        message: 'Unable to read the selected file. Please try again.',
      });
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processWorkspaceFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropFile = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processWorkspaceFile(file);
  };

  const updateSkin = <K extends keyof ThemeSkinVariables>(
    key: K,
    value: ThemeSkinVariables[K]
  ) => {
    onChangeConfig({
      ...config,
      skin: {
        ...config.skin,
        [key]: value,
      },
    });
  };

  const updateVersioning = (patch: Partial<SiteConfig['versioning']>) => {
    onChangeConfig({
      ...config,
      versioning: {
        ...config.versioning,
        ...patch,
      },
    });
  };

  const updateDeviceProfile = (
    device: DeviceProfileKey,
    patch: Partial<DeviceWidgetProfile>
  ) => {
    onChangeConfig({
      ...config,
      responsive: {
        ...config.responsive,
        [device]: {
          ...config.responsive[device],
          ...patch,
        },
      },
    });
  };

  const handleBumpVersion = () => {
    updateVersioning({
      version: bumpMinorVersion(config.versioning.version),
    });
  };

  const handleSaveSubmit = (e: FormEvent) => {
    e.preventDefault();
    const versionTag = normalizeVersionTag(config.versioning.version);
    onSaveSnapshot(snapshotLabel, versionTag);
    setSnapshotLabel('');
  };

  const updateFavicon = (patch: Partial<FaviconConfig>) => {
    onChangeConfig({
      ...config,
      favicon: {
        ...config.favicon,
        ...patch,
      },
    });
  };

  const liveFaviconSvgUri = buildBrandFaviconSvgDataUri({
    companyName: config.companyName,
    monogram: config.favicon.monogram,
    style: config.favicon.style,
    primaryColor: config.skin.primaryBrandColor,
    secondaryColor: config.skin.secondaryColor,
    accentColor: config.skin.accentColor,
  });

  const activeFaviconPreviewSrc = isSafeHostedIconUrl(config.favicon.customIconUrl)
    ? config.favicon.customIconUrl.trim()
    : config.favicon.style === 'studio-artwork'
    ? STUDIO_GENERATED_ICON_URL
    : liveFaviconSvgUri;

  const handleGenerateBrandFavicon = async () => {
    setIsGeneratingIcon(true);
    setFaviconStatus(null);
    try {
      const sourceUrl =
        config.favicon.style === 'studio-artwork'
          ? STUDIO_GENERATED_ICON_URL
          : liveFaviconSvgUri;
      const pngDataUri = await renderFaviconPngDataUri(sourceUrl, 64);
      const safeEmbedded = pngDataUri.length <= 24000 ? pngDataUri : '';
      updateFavicon({
        enabled: true,
        embeddedPngDataUri: safeEmbedded,
      });
      setFaviconStatus(
        safeEmbedded
          ? 'Generated icon & injected PNG + SVG <link rel="icon"> tags into XML <head>.'
          : 'Generated SVG icon & injected <link rel="icon"> tags into XML <head>.'
      );
    } catch {
      updateFavicon({
        enabled: true,
        embeddedPngDataUri: '',
      });
      setFaviconStatus(
        'Synced brand palette SVG <link rel="icon"> tags into XML <head>.'
      );
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleDownloadFaviconPng = async () => {
    try {
      const sourceUrl =
        config.favicon.style === 'studio-artwork'
          ? STUDIO_GENERATED_ICON_URL
          : liveFaviconSvgUri;
      const png180 = await renderFaviconPngDataUri(sourceUrl, 180);
      const link = document.createElement('a');
      link.href = png180;
      link.download = `apple-touch-icon-180x180.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setFaviconStatus('Unable to export PNG icon right now.');
    }
  };

  const handleDownloadFaviconSvg = () => {
    const svg = buildBrandFaviconSvg({
      companyName: config.companyName,
      monogram: config.favicon.monogram,
      style: config.favicon.style,
      primaryColor: config.skin.primaryBrandColor,
      secondaryColor: config.skin.secondaryColor,
      accentColor: config.skin.accentColor,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'favicon.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeVersionLabel = normalizeVersionTag(config.versioning.version);
  const currentDeviceProfile = config.responsive[activeDevice];
  const currentDeviceMeta = DEVICE_META[activeDevice];

  return (
    <aside
      aria-label="Theme Designer, Device Widgets and Snapshot History"
      className="w-full lg:w-[280px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col"
    >
      <div className="px-4 py-3 border-b border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              Theme Studio
            </h2>
            <span
              className="font-mono text-[11px] font-medium text-slate-500 tabular-nums shrink-0"
              title="Active theme iteration version"
            >
              {activeVersionLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Reset settings to EZIBLE defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Sidebar panels"
          className="grid grid-cols-3 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sidebarTab === 'design'}
            onClick={() => setSidebarTab('design')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              sidebarTab === 'design'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Design
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sidebarTab === 'devices'}
            onClick={() => setSidebarTab('devices')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              sidebarTab === 'devices'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Devices
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sidebarTab === 'history'}
            onClick={() => setSidebarTab('history')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
              sidebarTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>History ({snapshots.length})</span>
          </button>
        </div>
      </div>

      {sidebarTab === 'history' ? (
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          <form onSubmit={handleSaveSubmit} className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="snapshot-version-input"
                className="font-semibold text-slate-700"
              >
                Save Iteration Snapshot
              </label>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Max {MAX_CONFIG_SNAPSHOTS}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                id="snapshot-version-input"
                type="text"
                maxLength={24}
                aria-label="Theme iteration version tag"
                value={config.versioning.version}
                onChange={(e) => updateVersioning({ version: e.target.value })}
                placeholder="v1.0"
                className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none tabular-nums"
              />
              <button
                type="button"
                onClick={handleBumpVersion}
                title="Increment minor version number"
                className="px-2 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:border-slate-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
              >
                +0.1
              </button>
            </div>

            <input
              id="snapshot-label-input"
              type="text"
              maxLength={48}
              aria-label="Optional snapshot label"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder="Optional label (e.g. Mobile Drawer Pass)"
              className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save {activeVersionLabel} Snapshot</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Saved Snapshots</span>
              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] font-medium text-slate-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-center space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  No snapshots saved yet. Tag iterations (e.g. v1.0, v1.1) and store up to {MAX_CONFIG_SNAPSHOTS} checkpoints in browser storage to compare or roll back anytime.
                </p>
                <button
                  type="button"
                  onClick={() => onSaveSnapshot('Initial Baseline', activeVersionLabel)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Save {activeVersionLabel} Baseline
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-xs shrink-0 tabular-nums">
                            {snap.version}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {snap.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {formatSnapshotTimestamp(snap.savedAt)}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0 pt-0.5"
                        aria-label="Snapshot color swatches"
                      >
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300"
                          style={{ backgroundColor: snap.config.skin.mainBgColor }}
                          title={snap.config.skin.mainBgColor}
                        />
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300"
                          style={{ backgroundColor: snap.config.skin.primaryBrandColor }}
                          title={snap.config.skin.primaryBrandColor}
                        />
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300"
                          style={{ backgroundColor: snap.config.skin.secondaryColor }}
                          title={snap.config.skin.secondaryColor}
                        />
                        <span
                          className="w-3 h-3 rounded-xs border border-slate-300"
                          style={{ backgroundColor: snap.config.skin.accentColor }}
                          title={snap.config.skin.accentColor}
                        />
                      </div>
                    </div>

                    {snap.config.versioning?.notes && (
                      <p
                        className="text-[11px] text-slate-600 leading-snug truncate"
                        title={snap.config.versioning.notes}
                      >
                        {snap.config.versioning.notes}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-500 truncate tabular-nums">
                      {snap.config.homepageBlogLimit} home blogs ·{' '}
                      {snap.config.skin.headingFont} ·{' '}
                      {snap.config.minifyXml ? 'Minified' : 'Raw'}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRestoreSnapshot(snap)}
                        className="flex-1 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded hover:border-slate-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Restore {snap.version}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        aria-label={`Delete snapshot ${snap.version} ${snap.label}`}
                        className="p-1.5 text-slate-400 hover:text-red-700 bg-white border border-slate-200 rounded transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : sidebarTab === 'devices' ? (
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Device Profile Switcher (Synced with Live Preview Viewport) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Target Device</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {currentDeviceMeta.range}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Manage components by device"
              className="grid grid-cols-3 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
            >
              {(
                [
                  { id: 'desktop', label: 'Desktop', icon: Monitor },
                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = activeDevice === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectDevice(id)}
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">
              Manage layout columns, navigation style, widget visibility, and dedicated Blogger Layout sections independently for {currentDeviceMeta.label.toLowerCase()}.
            </p>
          </section>

          {/* Grid & Navigation Style for Active Device */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              {currentDeviceMeta.label} Layout &amp; Navigation
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">Grid Columns</div>
              <div
                role="radiogroup"
                aria-label={`${currentDeviceMeta.label} grid columns`}
                className="grid grid-cols-3 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
              >
                {([1, 2, 3] as const).map((cols) => {
                  const active = currentDeviceProfile.gridColumns === cols;
                  return (
                    <button
                      key={cols}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        updateDeviceProfile(activeDevice, { gridColumns: cols })
                      }
                      className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cols} Col
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">Header Navigation</div>
              <div
                role="radiogroup"
                aria-label={`${currentDeviceMeta.label} navigation mode`}
                className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
              >
                {(
                  [
                    { id: 'inline', label: 'Inline Links' },
                    { id: 'drawer', label: 'Slide Drawer' },
                  ] as const
                ).map((mode) => {
                  const active = currentDeviceProfile.navigationStyle === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        updateDeviceProfile(activeDevice, { navigationStyle: mode.id })
                      }
                      className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <label
                  htmlFor="device-compact-padding"
                  className="block text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Compact Section Padding
                </label>
                <span className="text-[11px] text-slate-500">
                  Tighter vertical rhythm on {currentDeviceMeta.label.toLowerCase()}.
                </span>
              </div>
              <button
                id="device-compact-padding"
                type="button"
                role="switch"
                aria-checked={currentDeviceProfile.compactPadding}
                onClick={() =>
                  updateDeviceProfile(activeDevice, {
                    compactPadding: !currentDeviceProfile.compactPadding,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  currentDeviceProfile.compactPadding ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    currentDeviceProfile.compactPadding ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Component & Widget Visibility Per Device */}
          <section className="space-y-2.5 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              {currentDeviceMeta.label} Component Visibility
            </div>
            <div className="space-y-2">
              {WIDGET_VISIBILITY_FIELDS.map((item) => {
                const enabled = currentDeviceProfile[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {item.label}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {item.sectionTag}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label={`Toggle ${item.label} on ${currentDeviceMeta.label}`}
                      aria-checked={enabled}
                      onClick={() =>
                        updateDeviceProfile(activeDevice, { [item.key]: !enabled })
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        enabled ? 'bg-blue-700' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Separate Dedicated Blogger Layout Widget Zone for Active Device */}
          <section className="space-y-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  {currentDeviceMeta.label}-Only Widget Zone
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {currentDeviceMeta.sectionId}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label={`Enable ${currentDeviceMeta.label}-only widget zone`}
                aria-checked={currentDeviceProfile.customWidgetEnabled}
                onClick={() =>
                  updateDeviceProfile(activeDevice, {
                    customWidgetEnabled: !currentDeviceProfile.customWidgetEnabled,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  currentDeviceProfile.customWidgetEnabled
                    ? 'bg-blue-700'
                    : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    currentDeviceProfile.customWidgetEnabled
                      ? 'translate-x-4.5'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {currentDeviceProfile.customWidgetEnabled && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  maxLength={80}
                  aria-label={`${currentDeviceMeta.label} custom widget heading`}
                  value={currentDeviceProfile.customWidgetTitle}
                  onChange={(e) =>
                    updateDeviceProfile(activeDevice, {
                      customWidgetTitle: e.target.value,
                    })
                  }
                  placeholder={`${currentDeviceMeta.label} widget title`}
                  className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
                />
                <textarea
                  rows={2}
                  maxLength={220}
                  aria-label={`${currentDeviceMeta.label} custom widget message`}
                  value={currentDeviceProfile.customWidgetBody}
                  onChange={(e) =>
                    updateDeviceProfile(activeDevice, {
                      customWidgetBody: e.target.value,
                    })
                  }
                  placeholder="Widget content visible exclusively on this device..."
                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none resize-none"
                />
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Theme Versioning Metadata */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Theme Versioning</span>
              <span className="font-mono text-[11px] text-slate-400">theme-version</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  id="theme-version-input"
                  type="text"
                  maxLength={24}
                  aria-label="Theme iteration version"
                  value={config.versioning.version}
                  onChange={(e) => updateVersioning({ version: e.target.value })}
                  placeholder="v1.0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleBumpVersion}
                  title="Increment minor version number"
                  className="px-2 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:border-slate-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                >
                  +0.1
                </button>
              </div>
              <input
                id="theme-version-notes"
                type="text"
                maxLength={120}
                aria-label="Theme iteration notes"
                value={config.versioning.notes}
                onChange={(e) => updateVersioning({ notes: e.target.value })}
                placeholder="Iteration note (e.g. Updated hero contrast)"
                className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>
          </section>

          {/* Blog Feed & Separate Blogs Page Routing */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Blog Feed &amp; Routing</span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                3–6 home
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-700">
                Homepage Blog Count
              </div>
              <div
                role="radiogroup"
                aria-label="Number of blogs shown on homepage"
                className="grid grid-cols-4 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
              >
                {BLOG_LIMIT_OPTIONS.map((count) => {
                  const active = config.homepageBlogLimit === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        onChangeConfig({ ...config, homepageBlogLimit: count })
                      }
                      className={`py-1 text-xs font-medium rounded transition-colors cursor-pointer tabular-nums ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-snug text-slate-500">
                Matches Blogger Settings &rarr; Posts &rarr; Max posts on main page (3–6). Tags and labels appear only on the separate Blogs page.
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="blogs-page-path"
                className="block text-xs font-medium text-slate-700"
              >
                All Blogs Page Path
              </label>
              <input
                id="blogs-page-path"
                type="text"
                value={config.blogsPagePath}
                onChange={(e) =>
                  onChangeConfig({ ...config, blogsPagePath: e.target.value })
                }
                placeholder="/search"
                className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>
          </section>

          {/* Visual Color Palette Selector (Primary & Secondary CSS Variables) */}
          <section className="space-y-3.5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <Palette className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Visual Color Palette</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">live CSS vars</span>
            </div>

            {/* Live Primary / Secondary / Accent Token Strip */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="space-y-1">
                  <div
                    className="h-5 rounded-xs border border-black/10"
                    style={{ backgroundColor: config.skin.primaryBrandColor }}
                    title={`--brand-primary: ${config.skin.primaryBrandColor}`}
                  />
                  <div className="text-[10px] font-medium text-slate-700 leading-none">
                    Primary
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tabular-nums leading-none">
                    {config.skin.primaryBrandColor}
                  </div>
                </div>
                <div className="space-y-1">
                  <div
                    className="h-5 rounded-xs border border-black/10"
                    style={{ backgroundColor: config.skin.secondaryColor }}
                    title={`--brand-secondary: ${config.skin.secondaryColor}`}
                  />
                  <div className="text-[10px] font-medium text-slate-700 leading-none">
                    Secondary
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tabular-nums leading-none">
                    {config.skin.secondaryColor}
                  </div>
                </div>
                <div className="space-y-1">
                  <div
                    className="h-5 rounded-xs border border-black/10"
                    style={{ backgroundColor: config.skin.accentColor }}
                    title={`--brand-accent: ${config.skin.accentColor}`}
                  />
                  <div className="text-[10px] font-medium text-slate-700 leading-none">
                    Accent
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase tabular-nums leading-none">
                    {config.skin.accentColor}
                  </div>
                </div>
              </div>
            </div>

            {/* Curated Palette Cards */}
            <div
              role="radiogroup"
              aria-label="Curated visual color palettes"
              className="grid grid-cols-2 gap-2"
            >
              {COLOR_PRESETS.map((preset) => {
                const isSelected =
                  config.skin.primaryBrandColor.toLowerCase() ===
                    preset.skin.primaryBrandColor.toLowerCase() &&
                  config.skin.secondaryColor.toLowerCase() ===
                    preset.skin.secondaryColor.toLowerCase() &&
                  config.skin.accentColor.toLowerCase() ===
                    preset.skin.accentColor.toLowerCase();

                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        skin: { ...config.skin, ...preset.skin },
                      })
                    }
                    className={`group text-left p-2 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-600 ring-1 ring-blue-600/20'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex h-4 w-full rounded-xs overflow-hidden border border-black/10 mb-1.5">
                      <span
                        className="flex-1"
                        style={{ backgroundColor: preset.skin.mainBgColor }}
                      />
                      <span
                        className="flex-1"
                        style={{ backgroundColor: preset.skin.primaryBrandColor }}
                      />
                      <span
                        className="flex-1"
                        style={{ backgroundColor: preset.skin.secondaryColor }}
                      />
                      <span
                        className="flex-1"
                        style={{ backgroundColor: preset.skin.accentColor }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-800 truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check
                          className="w-3 h-3 text-blue-700 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Direct Visual Swatch Rows for Primary & Secondary CSS Variables */}
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">Primary Swatches</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    --brand-primary
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Primary brand color swatches"
                  className="grid grid-cols-8 gap-1.5"
                >
                  {PRIMARY_SWATCHES.map((swatch) => {
                    const active =
                      config.skin.primaryBrandColor.toLowerCase() ===
                      swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Primary ${swatch.label} (${swatch.hex})`}
                        title={`${swatch.label} (${swatch.hex})`}
                        onClick={() => updateSkin('primaryBrandColor', swatch.hex)}
                        className={`h-6 w-full rounded-xs border transition-transform cursor-pointer flex items-center justify-center ${
                          active
                            ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105'
                            : 'border-black/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {active && (
                          <Check className="w-3 h-3 text-white" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700">Secondary Swatches</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    --brand-secondary
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Secondary brand color swatches"
                  className="grid grid-cols-8 gap-1.5"
                >
                  {SECONDARY_SWATCHES.map((swatch) => {
                    const active =
                      config.skin.secondaryColor.toLowerCase() ===
                      swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Secondary ${swatch.label} (${swatch.hex})`}
                        title={`${swatch.label} (${swatch.hex})`}
                        onClick={() => updateSkin('secondaryColor', swatch.hex)}
                        className={`h-6 w-full rounded-xs border transition-transform cursor-pointer flex items-center justify-center ${
                          active
                            ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105'
                            : 'border-black/15 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {active && (
                          <Check className="w-3 h-3 text-white" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Favicon & App Icon Generator (<link rel='icon'> XML Head Injection) */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Favicon / App Icon</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-label="Inject favicon link tags into XML head"
                aria-checked={config.favicon.enabled}
                onClick={() => updateFavicon({ enabled: !config.favicon.enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  config.favicon.enabled ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    config.favicon.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Live Browser Tab + App Icon Preview */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 bg-slate-900 shrink-0 shadow-xs"
                  title="App Icon preview (180x180)"
                >
                  <img
                    src={activeFaviconPreviewSrc}
                    alt={`${config.companyName} app icon preview`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-800">
                    <img
                      src={activeFaviconPreviewSrc}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="w-3.5 h-3.5 rounded-xs object-cover shrink-0"
                    />
                    <span className="truncate font-medium">
                      {config.companyName}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {config.favicon.enabled
                      ? isSafeHostedIconUrl(config.favicon.customIconUrl)
                        ? 'XML: Hosted HTTPS + SVG'
                        : config.favicon.embeddedPngDataUri
                        ? 'XML: Embedded PNG + SVG'
                        : 'XML: Embedded SVG + theme-color'
                      : 'XML head injection paused'}
                  </div>
                </div>
              </div>
            </div>

            {/* Icon Style Selector */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-700">
                Icon Artwork Style
              </div>
              <div
                role="radiogroup"
                aria-label="Favicon artwork style"
                className="grid grid-cols-2 gap-1.5"
              >
                {(
                  [
                    { id: 'studio-artwork', label: 'Studio Icon' },
                    { id: 'prism-monogram', label: 'Prism Mark' },
                    { id: 'hex-node', label: 'Hex Node' },
                    { id: 'minimal-badge', label: 'Minimal Mark' },
                  ] as { id: FaviconStyleOption; label: string }[]
                ).map((item) => {
                  const active = config.favicon.style === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        updateFavicon({
                          style: item.id,
                          embeddedPngDataUri: '',
                        })
                      }
                      className={`px-2 py-1.5 text-[11px] font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-blue-50/70 border-blue-600 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Monogram + Generate Action */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={2}
                aria-label="Favicon brand monogram letters"
                value={config.favicon.monogram}
                onChange={(e) =>
                  updateFavicon({
                    monogram: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    embeddedPngDataUri: '',
                  })
                }
                placeholder={extractBrandMonogram(config.companyName)}
                title="1-2 character brand monogram"
                className="w-14 px-2 py-1.5 text-xs font-mono font-semibold text-center uppercase text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
              <button
                type="button"
                disabled={isGeneratingIcon}
                onClick={handleGenerateBrandFavicon}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${isGeneratingIcon ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isGeneratingIcon ? 'Generating...' : 'Generate Icon'}</span>
              </button>
            </div>

            {/* Quick Icon Asset Downloads */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleDownloadFaviconPng}
                className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>PNG 180px</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadFaviconSvg}
                className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>SVG Vector</span>
              </button>
            </div>

            {/* Optional Custom Hosted HTTPS Favicon URL */}
            <div className="space-y-1">
              <label
                htmlFor="custom-favicon-url"
                className="block text-[11px] font-medium text-slate-700"
              >
                Hosted Icon URL (Optional)
              </label>
              <input
                id="custom-favicon-url"
                type="url"
                value={config.favicon.customIconUrl}
                onChange={(e) => updateFavicon({ customIconUrl: e.target.value })}
                placeholder="https://your-domain.com/favicon.png"
                className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>

            {faviconStatus && (
              <p className="text-[11px] leading-snug text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                {faviconStatus}
              </p>
            )}
          </section>

          {/* Blogger <b:skin> Color Variables */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Skin Color Variables
            </div>

            {(
              [
                { key: 'mainBgColor', varName: 'main.bg.color', label: 'Canvas Background' },
                {
                  key: 'primaryBrandColor',
                  varName: 'primary.brand.color',
                  label: 'Primary Brand',
                },
                {
                  key: 'secondaryColor',
                  varName: 'secondary.color',
                  label: 'Secondary Brand',
                },
                { key: 'accentColor', varName: 'accent.color', label: 'Accent Action' },
                { key: 'textColor', varName: 'text.color', label: 'Body Text' },
              ] as const
            ).map((field) => (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`color-${field.key}`} className="text-slate-700 font-medium">
                    {field.label}
                  </label>
                  <span className="font-mono text-[11px] text-slate-400">
                    {field.varName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`color-${field.key}`}
                    type="color"
                    value={config.skin[field.key]}
                    onChange={(e) => updateSkin(field.key, e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 bg-white cursor-pointer p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    aria-label={`${field.label} hex value`}
                    value={config.skin[field.key]}
                    onChange={(e) => updateSkin(field.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Blogger <b:skin> Font Variables */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Typography Variables
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="heading-font" className="text-slate-700 font-medium">
                  Heading Font
                </label>
                <span className="font-mono text-[11px] text-slate-400">heading.font</span>
              </div>
              <select
                id="heading-font"
                value={config.skin.headingFont}
                onChange={(e) =>
                  updateSkin('headingFont', e.target.value as HeadingFontOption)
                }
                className="w-full px-2.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              >
                {HEADING_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="body-font" className="text-slate-700 font-medium">
                  Body Font
                </label>
                <span className="font-mono text-[11px] text-slate-400">body.font</span>
              </div>
              <select
                id="body-font"
                value={config.skin.bodyFont}
                onChange={(e) =>
                  updateSkin('bodyFont', e.target.value as BodyFontOption)
                }
                className="w-full px-2.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              >
                {BODY_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Copyright-Free Lightweight Media Mode */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Theme Media Assets</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                {config.imageDeliveryMode === 'inline-svg'
                  ? `${getCc0SvgBundleSizeKb(
                      config.skin.primaryBrandColor,
                      config.skin.accentColor
                    )} KB`
                  : `${WEBP_ASSET_SIZES_KB.total} KB`}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Theme image delivery format"
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md"
            >
              {(
                [
                  { id: 'inline-svg', label: 'CC0 SVG' },
                  { id: 'webp-cdn', label: 'Light WebP' },
                ] as { id: ImageDeliveryMode; label: string }[]
              ).map((option) => {
                const active = config.imageDeliveryMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        imageDeliveryMode: option.id,
                      })
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="preload-critical-toggle"
                  className="block text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Preload Critical Assets
                </label>
                <p className="text-[11px] leading-snug text-slate-500">
                  Adds &lt;link rel=&apos;preload&apos;&gt; for logo and hero images.
                </p>
              </div>
              <button
                id="preload-critical-toggle"
                type="button"
                role="switch"
                aria-checked={config.preloadCriticalAssets}
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    preloadCriticalAssets: !config.preloadCriticalAssets,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  config.preloadCriticalAssets ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    config.preloadCriticalAssets ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="minify-xml-toggle"
                  className="block text-xs font-medium text-slate-800 cursor-pointer"
                >
                  Minify XML Output
                </label>
                <p className="text-[11px] leading-snug text-slate-500">
                  Strips comments &amp; whitespace while preserving Theme Designer vars.
                </p>
              </div>
              <button
                id="minify-xml-toggle"
                type="button"
                role="switch"
                aria-checked={config.minifyXml}
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    minifyXml: !config.minifyXml,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  config.minifyXml ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    config.minifyXml ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Organization JSON-LD & Newsletter Config */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Entity &amp; Automation
            </div>

            <div className="space-y-1">
              <label htmlFor="entity-name" className="block text-xs font-medium text-slate-700">
                Organization Name
              </label>
              <input
                id="entity-name"
                type="text"
                value={config.companyName}
                onChange={(e) =>
                  onChangeConfig({ ...config, companyName: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="entity-domain" className="block text-xs font-medium text-slate-700">
                Canonical Domain
              </label>
              <input
                id="entity-domain"
                type="url"
                value={config.domain}
                onChange={(e) =>
                  onChangeConfig({ ...config, domain: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="entity-area" className="block text-xs font-medium text-slate-700">
                Area Served
              </label>
              <input
                id="entity-area"
                type="text"
                value={config.areaServed}
                onChange={(e) =>
                  onChangeConfig({ ...config, areaServed: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="news-provider" className="block text-xs font-medium text-slate-700">
                Newsletter Provider
              </label>
              <select
                id="news-provider"
                value={config.newsletterProvider}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    newsletterProvider: e.target.value as NewsletterProvider,
                  })
                }
                className="w-full px-2.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              >
                {NEWSLETTER_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="news-action" className="block text-xs font-medium text-slate-700">
                Form Action Endpoint
              </label>
              <input
                id="news-action"
                type="url"
                value={config.newsletterActionUrl}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    newsletterActionUrl: e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>
          </section>
        </div>
      )}

      {/* Persistent Studio Workspace JSON Import & Export Dock */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropFile}
        className={`px-4 py-3 border-t transition-colors space-y-2.5 ${
          isDragOver
            ? 'bg-blue-50 border-blue-400'
            : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <FileJson className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Workspace Config</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">JSON</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Import studio workspace JSON configuration file"
          onChange={handleFileInputChange}
          className="sr-only"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:border-slate-500 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Import JSON</span>
          </button>
          <button
            type="button"
            onClick={onExportWorkspaceJson}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:border-slate-500 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Export JSON</span>
          </button>
        </div>

        <p className="text-[11px] leading-snug text-slate-500">
          {isDragOver
            ? 'Drop JSON file to restore workspace state.'
            : 'Upload or drop an exported JSON file to restore theme, devices & snapshots.'}
        </p>

        {importFeedback && (
          <div
            role={importFeedback.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start justify-between gap-2 px-2.5 py-2 rounded-md border text-[11px] leading-snug ${
              importFeedback.kind === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-start gap-1.5 min-w-0">
              {importFeedback.kind === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span className="break-words">{importFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportFeedback(null)}
              aria-label="Dismiss import message"
              className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
