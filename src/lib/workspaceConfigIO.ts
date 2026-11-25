import { DEFAULT_SITE_CONFIG } from '../data/defaultConfig';
import {
  BodyFontOption,
  ConfigSnapshot,
  DeviceProfileKey,
  HeadingFontOption,
  ImageDeliveryMode,
  NewsletterProvider,
  SiteConfig,
} from '../types/template';
import {
  formatVersionFilenameSlug,
  hydrateSiteConfig,
  MAX_CONFIG_SNAPSHOTS,
  normalizeVersionTag,
} from './configHistory';

export const WORKSPACE_EXPORT_SCHEMA = 'ezible-blogger-studio-workspace' as const;
export const WORKSPACE_EXPORT_VERSION = 1 as const;
export const MAX_WORKSPACE_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB

export interface StudioWorkspaceExport {
  schema: typeof WORKSPACE_EXPORT_SCHEMA;
  schemaVersion: typeof WORKSPACE_EXPORT_VERSION;
  exportedAt: string;
  activeDevice: DeviceProfileKey;
  config: SiteConfig;
  snapshots: ConfigSnapshot[];
}

export interface ImportedWorkspacePayload {
  config: SiteConfig;
  snapshots?: ConfigSnapshot[];
  activeDevice?: DeviceProfileKey;
  format: 'workspace-bundle' | 'site-config';
  summary: string;
}

export type WorkspaceImportResult =
  | ({ ok: true } & ImportedWorkspacePayload)
  | { ok: false; error: string };

const VALID_HEADING_FONTS = new Set<HeadingFontOption>([
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
  'Bricolage Grotesque',
]);

const VALID_BODY_FONTS = new Set<BodyFontOption>([
  'Public Sans',
  'DM Sans',
  'Plus Jakarta Sans',
  'Manrope',
]);

const VALID_NEWSLETTER_PROVIDERS = new Set<NewsletterProvider>([
  'Brevo',
  'Mailchimp',
  'ConvertKit',
  'Custom Webhook',
]);

const VALID_DELIVERY_MODES = new Set<ImageDeliveryMode>([
  'inline-svg',
  'webp-cdn',
]);

const VALID_DEVICES = new Set<DeviceProfileKey>(['desktop', 'tablet', 'mobile']);

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const RECOGNIZED_CONFIG_KEYS: (keyof SiteConfig)[] = [
  'companyName',
  'tagline',
  'domain',
  'areaServed',
  'heroHeadline',
  'heroSubheadline',
  'skin',
  'responsive',
  'versioning',
  'homepageBlogLimit',
  'blogsPagePath',
  'accessibility',
  'favicon',
  'services',
  'caseStudies',
  'insights',
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(rawText: string): unknown {
  return JSON.parse(rawText, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
}

function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  return fallback;
}

function sanitizeHttpUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function sanitizeRelativeOrHttpPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^\/[a-zA-Z0-9/_-]*$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function sanitizeImportedSiteConfig(raw: Record<string, unknown>): SiteConfig {
  const hydrated = hydrateSiteConfig(raw as Partial<SiteConfig>);
  const defaults = DEFAULT_SITE_CONFIG;

  const headingFont = VALID_HEADING_FONTS.has(hydrated.skin.headingFont)
    ? hydrated.skin.headingFont
    : defaults.skin.headingFont;
  const bodyFont = VALID_BODY_FONTS.has(hydrated.skin.bodyFont)
    ? hydrated.skin.bodyFont
    : defaults.skin.bodyFont;
  const newsletterProvider = VALID_NEWSLETTER_PROVIDERS.has(
    hydrated.newsletterProvider
  )
    ? hydrated.newsletterProvider
    : defaults.newsletterProvider;
  const imageDeliveryMode = VALID_DELIVERY_MODES.has(hydrated.imageDeliveryMode)
    ? hydrated.imageDeliveryMode
    : defaults.imageDeliveryMode;

  return {
    ...hydrated,
    companyName:
      typeof hydrated.companyName === 'string' && hydrated.companyName.trim()
        ? hydrated.companyName.trim().slice(0, 100)
        : defaults.companyName,
    tagline:
      typeof hydrated.tagline === 'string' && hydrated.tagline.trim()
        ? hydrated.tagline.trim().slice(0, 180)
        : defaults.tagline,
    domain: sanitizeHttpUrl(hydrated.domain, defaults.domain),
    blogsPagePath: sanitizeRelativeOrHttpPath(
      hydrated.blogsPagePath,
      defaults.blogsPagePath
    ),
    newsletterProvider,
    newsletterActionUrl: sanitizeHttpUrl(
      hydrated.newsletterActionUrl,
      defaults.newsletterActionUrl
    ),
    imageDeliveryMode,
    favicon: {
      ...hydrated.favicon,
      customIconUrl: hydrated.favicon.customIconUrl
        ? sanitizeHttpUrl(hydrated.favicon.customIconUrl, '')
        : '',
      embeddedPngDataUri:
        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
          hydrated.favicon.embeddedPngDataUri
        ) && hydrated.favicon.embeddedPngDataUri.length <= 24000
          ? hydrated.favicon.embeddedPngDataUri
          : '',
    },
    skin: {
      mainBgColor: sanitizeHexColor(
        hydrated.skin.mainBgColor,
        defaults.skin.mainBgColor
      ),
      primaryBrandColor: sanitizeHexColor(
        hydrated.skin.primaryBrandColor,
        defaults.skin.primaryBrandColor
      ),
      secondaryColor: sanitizeHexColor(
        hydrated.skin.secondaryColor,
        defaults.skin.secondaryColor
      ),
      accentColor: sanitizeHexColor(
        hydrated.skin.accentColor,
        defaults.skin.accentColor
      ),
      textColor: sanitizeHexColor(
        hydrated.skin.textColor,
        defaults.skin.textColor
      ),
      headingFont,
      bodyFont,
    },
  };
}

function sanitizeImportedSnapshots(rawSnapshots: unknown): ConfigSnapshot[] {
  if (!Array.isArray(rawSnapshots)) return [];

  const sanitized: ConfigSnapshot[] = [];
  for (let i = 0; i < rawSnapshots.length && sanitized.length < MAX_CONFIG_SNAPSHOTS; i++) {
    const item = rawSnapshots[i];
    if (!isPlainRecord(item) || !isPlainRecord(item.config)) continue;

    const hydratedConfig = sanitizeImportedSiteConfig(item.config);
    const version = normalizeVersionTag(
      typeof item.version === 'string' && item.version.trim()
        ? item.version
        : hydratedConfig.versioning.version
    );
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().slice(0, 64)
        : `snap-import-${Date.now()}-${i}`;
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim().slice(0, 64)
        : 'Imported Snapshot';
    const savedAt =
      typeof item.savedAt === 'string' && !Number.isNaN(Date.parse(item.savedAt))
        ? item.savedAt
        : new Date().toISOString();

    sanitized.push({
      id,
      version,
      label,
      savedAt,
      config: {
        ...hydratedConfig,
        versioning: {
          ...hydratedConfig.versioning,
          version,
        },
      },
    });
  }
  return sanitized;
}

function hasRecognizedConfigFields(record: Record<string, unknown>): boolean {
  return RECOGNIZED_CONFIG_KEYS.some((key) => key in record);
}

export function serializeWorkspaceExport(
  config: SiteConfig,
  snapshots: ConfigSnapshot[],
  activeDevice: DeviceProfileKey
): string {
  const payload: StudioWorkspaceExport = {
    schema: WORKSPACE_EXPORT_SCHEMA,
    schemaVersion: WORKSPACE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    activeDevice,
    config,
    snapshots: snapshots.slice(0, MAX_CONFIG_SNAPSHOTS),
  };
  return JSON.stringify(payload, null, 2);
}

export function buildWorkspaceExportFilename(config: SiteConfig): string {
  const versionSlug = formatVersionFilenameSlug(config.versioning.version);
  return `ezible-studio-workspace-${versionSlug}.json`;
}

export function parseImportedWorkspaceJson(rawText: string): WorkspaceImportResult {
  if (!rawText || !rawText.trim()) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = safeJsonParse(rawText);
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON syntax. Please upload a valid exported studio config file.',
    };
  }

  if (!isPlainRecord(parsed)) {
    return {
      ok: false,
      error: 'JSON root must be an object containing workspace or SiteConfig settings.',
    };
  }

  // Case 1: Full StudioWorkspaceExport bundle (or snapshot wrapper containing `config`)
  if (isPlainRecord(parsed.config)) {
    if (!hasRecognizedConfigFields(parsed.config)) {
      return {
        ok: false,
        error: 'The "config" object does not match any recognized Theme Studio settings.',
      };
    }

    const config = sanitizeImportedSiteConfig(parsed.config);
    const hasSnapshots = Array.isArray(parsed.snapshots);
    const snapshots = hasSnapshots
      ? sanitizeImportedSnapshots(parsed.snapshots)
      : undefined;
    const activeDevice =
      typeof parsed.activeDevice === 'string' &&
      VALID_DEVICES.has(parsed.activeDevice as DeviceProfileKey)
        ? (parsed.activeDevice as DeviceProfileKey)
        : undefined;

    const versionLabel = normalizeVersionTag(config.versioning.version);
    const snapSummary =
      snapshots && snapshots.length > 0
        ? ` and ${snapshots.length} ${snapshots.length === 1 ? 'snapshot' : 'snapshots'}`
        : '';

    return {
      ok: true,
      format: 'workspace-bundle',
      config,
      snapshots,
      activeDevice,
      summary: `Restored ${versionLabel} workspace${snapSummary}.`,
    };
  }

  // Case 2: Raw SiteConfig JSON object
  if (hasRecognizedConfigFields(parsed)) {
    const config = sanitizeImportedSiteConfig(parsed);
    const versionLabel = normalizeVersionTag(config.versioning.version);
    return {
      ok: true,
      format: 'site-config',
      config,
      summary: `Restored ${versionLabel} site configuration.`,
    };
  }

  return {
    ok: false,
    error:
      'Unrecognized JSON structure. Upload a previously exported EZIBLE Studio workspace or SiteConfig JSON file.',
  };
}
