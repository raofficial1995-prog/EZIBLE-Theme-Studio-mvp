import { DEFAULT_SITE_CONFIG } from '../data/defaultConfig';
import {
  AccessibilityConfig,
  ConfigSnapshot,
  DeviceWidgetProfile,
  FaviconConfig,
  FaviconStyleOption,
  HomepageBlogLimit,
  ResponsiveLayoutConfig,
  SiteConfig,
  ThemeVersioning,
} from '../types/template';

export const MAX_CONFIG_SNAPSHOTS = 5;
export const HISTORY_STORAGE_KEY = 'ezible_site_config_history_v1';

export function normalizeVersionTag(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return DEFAULT_SITE_CONFIG.versioning.version;
  }
  return trimmed.slice(0, 24);
}

/**
 * Increments the trailing numeric segment of a version label for quick iteration tagging.
 * Examples: "v1.0" -> "v1.1", "v1.9" -> "v1.10", "v2.1.3" -> "v2.1.4", "draft" -> "v1.1"
 */
export function bumpMinorVersion(raw?: string): string {
  const current = normalizeVersionTag(raw);
  const match = current.match(/^(.*?)(\d+)([^0-9]*)$/);
  if (!match) {
    return 'v1.1';
  }
  const [, prefix, digits, suffix] = match;
  const nextNumber = Number.parseInt(digits, 10) + 1;
  return `${prefix}${nextNumber}${suffix}`;
}

export function formatVersionFilenameSlug(raw?: string): string {
  const normalized = normalizeVersionTag(raw)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'v1.0';
}

export function clampHomepageBlogLimit(value?: number): HomepageBlogLimit {
  if (value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (rounded <= 3) return 3;
    if (rounded >= 6) return 6;
    return rounded as HomepageBlogLimit;
  }
  return DEFAULT_SITE_CONFIG.homepageBlogLimit;
}

function hydrateDeviceProfile(
  raw: Partial<DeviceWidgetProfile> | undefined,
  fallback: DeviceWidgetProfile
): DeviceWidgetProfile {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }
  const cols =
    raw.gridColumns === 1 || raw.gridColumns === 2 || raw.gridColumns === 3
      ? raw.gridColumns
      : fallback.gridColumns;
  return {
    gridColumns: cols,
    showHeroMedia:
      typeof raw.showHeroMedia === 'boolean' ? raw.showHeroMedia : fallback.showHeroMedia,
    showServices:
      typeof raw.showServices === 'boolean' ? raw.showServices : fallback.showServices,
    showCaseStudies:
      typeof raw.showCaseStudies === 'boolean' ? raw.showCaseStudies : fallback.showCaseStudies,
    showTestimonials:
      typeof raw.showTestimonials === 'boolean'
        ? raw.showTestimonials
        : fallback.showTestimonials,
    showHomeBlogs:
      typeof raw.showHomeBlogs === 'boolean' ? raw.showHomeBlogs : fallback.showHomeBlogs,
    showNewsletterWidget:
      typeof raw.showNewsletterWidget === 'boolean'
        ? raw.showNewsletterWidget
        : fallback.showNewsletterWidget,
    showContactWidget:
      typeof raw.showContactWidget === 'boolean'
        ? raw.showContactWidget
        : fallback.showContactWidget,
    compactPadding:
      typeof raw.compactPadding === 'boolean' ? raw.compactPadding : fallback.compactPadding,
    navigationStyle:
      raw.navigationStyle === 'inline' || raw.navigationStyle === 'drawer'
        ? raw.navigationStyle
        : fallback.navigationStyle,
    customWidgetEnabled:
      typeof raw.customWidgetEnabled === 'boolean'
        ? raw.customWidgetEnabled
        : fallback.customWidgetEnabled,
    customWidgetTitle:
      typeof raw.customWidgetTitle === 'string'
        ? raw.customWidgetTitle.slice(0, 80)
        : fallback.customWidgetTitle,
    customWidgetBody:
      typeof raw.customWidgetBody === 'string'
        ? raw.customWidgetBody.slice(0, 220)
        : fallback.customWidgetBody,
  };
}

function hydrateResponsiveConfig(
  raw?: Partial<ResponsiveLayoutConfig>
): ResponsiveLayoutConfig {
  return {
    desktop: hydrateDeviceProfile(raw?.desktop, DEFAULT_SITE_CONFIG.responsive.desktop),
    tablet: hydrateDeviceProfile(raw?.tablet, DEFAULT_SITE_CONFIG.responsive.tablet),
    mobile: hydrateDeviceProfile(raw?.mobile, DEFAULT_SITE_CONFIG.responsive.mobile),
  };
}

function hydrateVersioning(raw?: Partial<ThemeVersioning>): ThemeVersioning {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SITE_CONFIG.versioning };
  }
  return {
    version:
      typeof raw.version === 'string' && raw.version.trim().length > 0
        ? raw.version.trim().slice(0, 24)
        : DEFAULT_SITE_CONFIG.versioning.version,
    notes:
      typeof raw.notes === 'string'
        ? raw.notes.slice(0, 120)
        : DEFAULT_SITE_CONFIG.versioning.notes,
  };
}

function hydrateAccessibility(
  raw?: Partial<AccessibilityConfig>
): AccessibilityConfig {
  const fallback = DEFAULT_SITE_CONFIG.accessibility;
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }
  return {
    autoFillMissingAlt:
      typeof raw.autoFillMissingAlt === 'boolean'
        ? raw.autoFillMissingAlt
        : fallback.autoFillMissingAlt,
    enforceAriaLandmarks:
      typeof raw.enforceAriaLandmarks === 'boolean'
        ? raw.enforceAriaLandmarks
        : fallback.enforceAriaLandmarks,
    includeSkipToContent:
      typeof raw.includeSkipToContent === 'boolean'
        ? raw.includeSkipToContent
        : fallback.includeSkipToContent,
    respectReducedMotion:
      typeof raw.respectReducedMotion === 'boolean'
        ? raw.respectReducedMotion
        : fallback.respectReducedMotion,
  };
}

function hydrateFavicon(raw?: Partial<FaviconConfig>): FaviconConfig {
  const fallback = DEFAULT_SITE_CONFIG.favicon;
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }
  const validStyles: FaviconStyleOption[] = [
    'studio-artwork',
    'prism-monogram',
    'hex-node',
    'minimal-badge',
  ];
  const style =
    typeof raw.style === 'string' &&
    validStyles.includes(raw.style as FaviconStyleOption)
      ? (raw.style as FaviconStyleOption)
      : fallback.style;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    style,
    monogram:
      typeof raw.monogram === 'string'
        ? raw.monogram.trim().slice(0, 2).toUpperCase()
        : fallback.monogram,
    customIconUrl:
      typeof raw.customIconUrl === 'string'
        ? raw.customIconUrl.trim().slice(0, 300)
        : fallback.customIconUrl,
    embeddedPngDataUri:
      typeof raw.embeddedPngDataUri === 'string' &&
      raw.embeddedPngDataUri.startsWith('data:image/png;base64,') &&
      raw.embeddedPngDataUri.length <= 24000
        ? raw.embeddedPngDataUri
        : fallback.embeddedPngDataUri,
  };
}

export function hydrateSiteConfig(raw: Partial<SiteConfig> | undefined): SiteConfig {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_SITE_CONFIG);
  }

  const rawInsights = Array.isArray(raw.insights) && raw.insights.length >= 6
    ? raw.insights.map((post) => ({
        ...post,
        tags:
          Array.isArray(post.tags) && post.tags.length > 0
            ? post.tags
            : [post.category || 'Engineering'],
      }))
    : structuredClone(DEFAULT_SITE_CONFIG.insights);

  return {
    ...DEFAULT_SITE_CONFIG,
    ...raw,
    versioning: hydrateVersioning(raw.versioning),
    homepageBlogLimit: clampHomepageBlogLimit(raw.homepageBlogLimit),
    blogsPagePath:
      typeof raw.blogsPagePath === 'string' && raw.blogsPagePath.trim().length > 0
        ? raw.blogsPagePath.trim()
        : DEFAULT_SITE_CONFIG.blogsPagePath,
    responsive: hydrateResponsiveConfig(raw.responsive),
    accessibility: hydrateAccessibility(raw.accessibility),
    favicon: hydrateFavicon(raw.favicon),
    insights: rawInsights,
    imageDeliveryMode:
      raw.imageDeliveryMode || DEFAULT_SITE_CONFIG.imageDeliveryMode,
    preloadCriticalAssets:
      typeof raw.preloadCriticalAssets === 'boolean'
        ? raw.preloadCriticalAssets
        : DEFAULT_SITE_CONFIG.preloadCriticalAssets,
    minifyXml:
      typeof raw.minifyXml === 'boolean'
        ? raw.minifyXml
        : DEFAULT_SITE_CONFIG.minifyXml,
    includeSocialMetaTags:
      typeof raw.includeSocialMetaTags === 'boolean'
        ? raw.includeSocialMetaTags
        : DEFAULT_SITE_CONFIG.includeSocialMetaTags,
    skin: {
      ...DEFAULT_SITE_CONFIG.skin,
      ...(raw.skin || {}),
      mainBgColor:
        typeof raw.skin?.mainBgColor === 'string' && raw.skin.mainBgColor.trim()
          ? raw.skin.mainBgColor
          : DEFAULT_SITE_CONFIG.skin.mainBgColor,
      primaryBrandColor:
        typeof raw.skin?.primaryBrandColor === 'string' && raw.skin.primaryBrandColor.trim()
          ? raw.skin.primaryBrandColor
          : DEFAULT_SITE_CONFIG.skin.primaryBrandColor,
      secondaryColor:
        typeof raw.skin?.secondaryColor === 'string' && raw.skin.secondaryColor.trim()
          ? raw.skin.secondaryColor
          : DEFAULT_SITE_CONFIG.skin.secondaryColor,
      accentColor:
        typeof raw.skin?.accentColor === 'string' && raw.skin.accentColor.trim()
          ? raw.skin.accentColor
          : DEFAULT_SITE_CONFIG.skin.accentColor,
      textColor:
        typeof raw.skin?.textColor === 'string' && raw.skin.textColor.trim()
          ? raw.skin.textColor
          : DEFAULT_SITE_CONFIG.skin.textColor,
    },
  };
}

export function loadConfigHistory(): ConfigSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ConfigSnapshot =>
          Boolean(item && typeof item.id === 'string' && item.config)
      )
      .slice(0, MAX_CONFIG_SNAPSHOTS)
      .map((item) => {
        const hydratedConfig = hydrateSiteConfig(item.config);
        const version = normalizeVersionTag(
          typeof item.version === 'string' && item.version.trim()
            ? item.version
            : hydratedConfig.versioning.version
        );
        return {
          id: item.id,
          version,
          label:
            typeof item.label === 'string' && item.label.trim()
              ? item.label
              : 'Saved Snapshot',
          savedAt:
            typeof item.savedAt === 'string'
              ? item.savedAt
              : new Date().toISOString(),
          config: {
            ...hydratedConfig,
            versioning: {
              ...hydratedConfig.versioning,
              version,
            },
          },
        };
      });
  } catch {
    return [];
  }
}

export function persistConfigHistory(snapshots: ConfigSnapshot[]): void {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(snapshots.slice(0, MAX_CONFIG_SNAPSHOTS))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function createConfigSnapshot(
  config: SiteConfig,
  customLabel?: string,
  versionOverride?: string
): ConfigSnapshot {
  const version = normalizeVersionTag(versionOverride ?? config.versioning?.version);
  const trimmed = customLabel?.trim();
  const label =
    trimmed && trimmed.length > 0
      ? trimmed
      : `${config.skin.headingFont} · ${config.skin.accentColor.toUpperCase()}`;

  const cloned = structuredClone(config);
  cloned.versioning = {
    version,
    notes: (cloned.versioning?.notes ?? '').trim().slice(0, 120),
  };

  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    version,
    label,
    savedAt: new Date().toISOString(),
    config: cloned,
  };
}

export function pushConfigSnapshot(
  existing: ConfigSnapshot[],
  next: ConfigSnapshot
): ConfigSnapshot[] {
  return [next, ...existing].slice(0, MAX_CONFIG_SNAPSHOTS);
}

export function formatSnapshotTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
