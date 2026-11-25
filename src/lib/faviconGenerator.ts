import { FaviconConfig, FaviconStyleOption, SiteConfig } from '../types/template';

export const STUDIO_GENERATED_ICON_URL =
  '/src/assets/images/ezible_app_icon_1795599440034.jpg';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function safeColor(color: string | undefined, fallback: string): string {
  if (color && HEX_COLOR_RE.test(color.trim())) {
    return color.trim();
  }
  return fallback;
}

function escapeSvgText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXmlAttr(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function extractBrandMonogram(
  companyName: string,
  customMonogram?: string
): string {
  const custom = (customMonogram || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (custom.length > 0) {
    return custom.slice(0, 2);
  }

  const words = companyName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  if (words.length === 0) return 'EZ';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export interface BrandIconParams {
  companyName: string;
  monogram?: string;
  style: FaviconStyleOption;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/**
 * Generates a crisp, self-contained 128x128 SVG site icon / app icon
 * reflecting the active brand monogram and Studio color palette.
 */
export function buildBrandFaviconSvg(params: BrandIconParams): string {
  const primary = safeColor(params.primaryColor, '#0F172A');
  const secondary = safeColor(params.secondaryColor, '#334155');
  const accent = safeColor(params.accentColor, '#1D4ED8');
  const initials = escapeSvgText(
    extractBrandMonogram(params.companyName, params.monogram)
  );
  const singleLetter = initials.length === 1;
  const fontSize = singleLetter ? 64 : 50;

  if (params.style === 'hex-node') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${escapeSvgText(params.companyName)} icon"><rect width="128" height="128" rx="28" fill="${primary}"/><polygon points="64,14 108,39 108,89 64,114 20,89 20,39" fill="none" stroke="${secondary}" stroke-width="6"/><polygon points="64,14 108,39 64,64 20,39" fill="${accent}" fill-opacity="0.24"/><circle cx="64" cy="14" r="5" fill="${accent}"/><circle cx="108" cy="39" r="5" fill="${accent}"/><circle cx="20" cy="89" r="5" fill="${accent}"/><text x="64" y="79" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${singleLetter ? 54 : 42}" font-weight="800" letter-spacing="-1.5" fill="#F8FAFC">${initials}</text></svg>`;
  }

  if (params.style === 'minimal-badge') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${escapeSvgText(params.companyName)} icon"><rect width="128" height="128" rx="28" fill="${primary}"/><rect x="12" y="12" width="104" height="104" rx="20" fill="none" stroke="${secondary}" stroke-width="3"/><rect x="22" y="96" width="84" height="10" rx="5" fill="${accent}"/><text x="64" y="76" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="-2" fill="#F8FAFC">${initials}</text></svg>`;
  }

  // Default & 'prism-monogram' / 'studio-artwork' vector twin:
  // Architectural layered prism frame inspired by the generated EZIBLE Studio icon
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${escapeSvgText(params.companyName)} icon"><rect width="128" height="128" rx="28" fill="${primary}"/><path d="M20 28L34 20H108V36L94 44H20V28Z" fill="${accent}" fill-opacity="0.22"/><path d="M22 106L34 96H106V106H22Z" fill="${secondary}"/><rect x="16" y="16" width="10" height="96" rx="4" fill="${accent}"/><text x="72" y="82" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="-2" fill="#F8FAFC">${initials}</text></svg>`;
}

export function buildBrandFaviconSvgDataUri(params: BrandIconParams): string {
  const svg = buildBrandFaviconSvg(params);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Renders either the generated Studio artwork or an SVG data URI onto an offscreen
 * HTML canvas to produce a crisp, rounded-square PNG data URI (for downloads or compact XML embedding).
 */
export function renderFaviconPngDataUri(
  sourceUrl: string,
  size: number = 64
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        const radius = Math.round(size * 0.22);
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load icon image onto canvas'));
    img.src = sourceUrl;
  });
}

export interface ResolvedFaviconHead {
  enabled: boolean;
  svgDataUri: string;
  primaryIconHref: string;
  primaryIconType: 'image/png' | 'image/svg+xml';
  appleTouchHref: string;
  themeColor: string;
  xmlBlock: string;
}

export function isSafeHostedIconUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(trimmed);
}

export function isSafePngDataUri(uri: string | undefined): boolean {
  if (!uri) return false;
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(uri.trim());
}

/**
 * Resolves the exact Blogger XML <head> <link rel='icon'> and <link rel='apple-touch-icon'>
 * tags from SiteConfig. Never emits local preview paths (/src/assets/...).
 */
export function resolveFaviconHeadLinks(config: SiteConfig): ResolvedFaviconHead {
  const favicon: FaviconConfig = config.favicon;
  const svgDataUri = buildBrandFaviconSvgDataUri({
    companyName: config.companyName,
    monogram: favicon.monogram,
    style: favicon.style,
    primaryColor: config.skin.primaryBrandColor,
    secondaryColor: config.skin.secondaryColor,
    accentColor: config.skin.accentColor,
  });

  const themeColor = safeColor(config.skin.primaryBrandColor, '#0F172A');

  if (!favicon.enabled) {
    return {
      enabled: false,
      svgDataUri,
      primaryIconHref: svgDataUri,
      primaryIconType: 'image/svg+xml',
      appleTouchHref: svgDataUri,
      themeColor,
      xmlBlock: '',
    };
  }

  const hostedUrl = isSafeHostedIconUrl(favicon.customIconUrl)
    ? favicon.customIconUrl.trim()
    : '';
  const bakedPng = isSafePngDataUri(favicon.embeddedPngDataUri)
    ? favicon.embeddedPngDataUri.trim()
    : '';

  const primaryIconHref = hostedUrl || bakedPng || svgDataUri;
  const primaryIconType: 'image/png' | 'image/svg+xml' =
    hostedUrl || bakedPng ? 'image/png' : 'image/svg+xml';
  const appleTouchHref = hostedUrl || bakedPng || svgDataUri;

  const escapedSvg = escapeXmlAttr(svgDataUri);
  const escapedPrimary = escapeXmlAttr(primaryIconHref);
  const escapedApple = escapeXmlAttr(appleTouchHref);
  const escapedTheme = escapeXmlAttr(themeColor);

  const lines = [
    '',
    '  <!-- Brand Favicon, Apple Touch Icon and Theme Color -->',
    `  <link href='${escapedSvg}' rel='icon' sizes='any' type='image/svg+xml'/>`,
    `  <link href='${escapedPrimary}' rel='icon' sizes='32x32' type='${primaryIconType}'/>`,
    `  <link href='${escapedPrimary}' rel='shortcut icon' type='${primaryIconType}'/>`,
    `  <link href='${escapedApple}' rel='apple-touch-icon' sizes='180x180'/>`,
    `  <meta content='${escapedTheme}' name='theme-color'/>`,
  ];

  return {
    enabled: true,
    svgDataUri,
    primaryIconHref,
    primaryIconType,
    appleTouchHref,
    themeColor,
    xmlBlock: lines.join('\n'),
  };
}
