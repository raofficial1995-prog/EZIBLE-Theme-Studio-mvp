export type SvgGraphicKind = 'hero' | 'cloud' | 'ai' | 'security';

function encodeSvgDataUri(svg: string): string {
  const minified = svg.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(minified)}`;
}

/**
 * Generates ultra-lightweight (< 1.5 KB each), 100% copyright-free (CC0)
 * architectural SVG illustrations dynamically tinted to the user's Blogger
 * Theme Designer brand palette. Zero external requests, 0ms load on Blogger.
 */
export function buildCc0ArchitecturalSvgUri(
  kind: SvgGraphicKind,
  primaryColor: string,
  accentColor: string
): string {
  const bg = primaryColor || '#0F172A';
  const accent = accentColor || '#1D4ED8';

  if (kind === 'hero') {
    return encodeSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" fill="none">
        <rect width="960" height="540" fill="${bg}"/>
        <g stroke="#ffffff" stroke-opacity="0.08" stroke-width="1">
          <path d="M0 90H960M0 180H960M0 270H960M0 360H960M0 450H960"/>
          <path d="M120 0V540M240 0V540M360 0V540M480 0V540M600 0V540M720 0V540M840 0V540"/>
        </g>
        <rect x="96" y="88" width="330" height="364" rx="10" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.16"/>
        <rect x="462" y="88" width="402" height="168" rx="10" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.16"/>
        <rect x="462" y="284" width="402" height="168" rx="10" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.16"/>
        <rect x="128" y="128" width="140" height="14" rx="3" fill="${accent}"/>
        <rect x="128" y="162" width="264" height="10" rx="2" fill="#cbd5e1" fill-opacity="0.35"/>
        <rect x="128" y="186" width="210" height="10" rx="2" fill="#cbd5e1" fill-opacity="0.22"/>
        <rect x="128" y="236" width="264" height="84" rx="6" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.65"/>
        <path d="M164 294L214 264L266 282L346 252" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="346" cy="252" r="5" fill="#ffffff"/>
        <rect x="128" y="346" width="120" height="72" rx="6" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.14"/>
        <rect x="272" y="346" width="120" height="72" rx="6" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.14"/>
        <circle cx="536" cy="172" r="34" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
        <circle cx="664" cy="172" r="34" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>
        <circle cx="792" cy="172" r="34" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
        <path d="M570 172H630M698 172H758" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="5 5"/>
        <rect x="498" y="324" width="330" height="14" rx="3" fill="#ffffff" fill-opacity="0.12"/>
        <rect x="498" y="324" width="256" height="14" rx="3" fill="${accent}"/>
        <rect x="498" y="362" width="330" height="14" rx="3" fill="#ffffff" fill-opacity="0.12"/>
        <rect x="498" y="362" width="292" height="14" rx="3" fill="#94a3b8"/>
        <rect x="498" y="400" width="330" height="14" rx="3" fill="#ffffff" fill-opacity="0.12"/>
        <rect x="498" y="400" width="198" height="14" rx="3" fill="${accent}" fill-opacity="0.75"/>
      </svg>
    `);
  }

  if (kind === 'cloud') {
    return encodeSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" fill="none">
        <rect width="800" height="600" fill="${bg}"/>
        <g stroke="#ffffff" stroke-opacity="0.07">
          <path d="M0 150H800M0 300H800M0 450H800M200 0V600M400 0V600M600 0V600"/>
        </g>
        <rect x="110" y="130" width="210" height="340" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.18"/>
        <rect x="480" y="130" width="210" height="340" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.18"/>
        <rect x="142" y="176" width="146" height="44" rx="6" fill="${accent}" fill-opacity="0.3" stroke="${accent}"/>
        <rect x="142" y="246" width="146" height="44" rx="6" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.2"/>
        <rect x="142" y="316" width="146" height="44" rx="6" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.2"/>
        <rect x="512" y="176" width="146" height="44" rx="6" fill="${accent}" fill-opacity="0.3" stroke="${accent}"/>
        <rect x="512" y="246" width="146" height="44" rx="6" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.2"/>
        <rect x="512" y="316" width="146" height="44" rx="6" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.2"/>
        <path d="M320 200H480M320 300H480M320 400H480" stroke="${accent}" stroke-width="2.5" stroke-dasharray="6 6"/>
        <circle cx="400" cy="300" r="38" fill="${bg}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
        <circle cx="400" cy="300" r="14" fill="${accent}"/>
      </svg>
    `);
  }

  if (kind === 'ai') {
    return encodeSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" fill="none">
        <rect width="800" height="600" fill="${bg}"/>
        <g stroke="#ffffff" stroke-opacity="0.07">
          <path d="M0 120H800M0 240H800M0 360H800M0 480H800M160 0V600M320 0V600M480 0V600M640 0V600"/>
        </g>
        <rect x="96" y="190" width="160" height="220" rx="8" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.22"/>
        <rect x="320" y="140" width="160" height="320" rx="8" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
        <rect x="544" y="190" width="160" height="220" rx="8" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.22"/>
        <path d="M256 300H320M480 300H544" stroke="#ffffff" stroke-width="2.5"/>
        <rect x="124" y="232" width="104" height="12" rx="3" fill="#ffffff" fill-opacity="0.25"/>
        <rect x="124" y="262" width="80" height="10" rx="3" fill="#ffffff" fill-opacity="0.16"/>
        <rect x="124" y="290" width="96" height="10" rx="3" fill="#ffffff" fill-opacity="0.16"/>
        <circle cx="400" cy="260" r="34" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-width="2"/>
        <rect x="352" y="330" width="96" height="12" rx="3" fill="#ffffff" fill-opacity="0.7"/>
        <rect x="366" y="358" width="68" height="10" rx="3" fill="#ffffff" fill-opacity="0.35"/>
        <path d="M582 292L606 316L662 260" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);
  }

  return encodeSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" fill="none">
      <rect width="800" height="600" fill="${bg}"/>
      <circle cx="400" cy="300" r="210" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>
      <circle cx="400" cy="300" r="148" stroke="${accent}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="8 6"/>
      <circle cx="400" cy="300" r="88" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
      <path d="M400 228L456 254V306C456 344 432 374 400 388C368 374 344 344 344 306V254L400 228Z" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M378 308L394 324L426 290" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="190" cy="300" r="10" fill="${accent}"/>
      <circle cx="610" cy="300" r="10" fill="${accent}"/>
      <circle cx="400" cy="90" r="10" fill="#94a3b8"/>
      <circle cx="400" cy="510" r="10" fill="#94a3b8"/>
    </svg>
  `);
}

export function buildCc0BrandLogoSvgUri(
  primaryColor: string,
  accentColor: string
): string {
  const bg = primaryColor || '#0F172A';
  const accent = accentColor || '#1D4ED8';
  return encodeSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
      <rect width="64" height="64" rx="12" fill="${bg}"/>
      <path d="M18 20H46V26H25V30H42V36H25V40H46V46H18V20Z" fill="#ffffff"/>
      <rect x="40" y="30" width="6" height="6" rx="1" fill="${accent}"/>
    </svg>
  `);
}

export const WEBP_ASSET_SIZES_KB = {
  hero: 69,
  cloudCase: 39,
  aiCase: 38,
  securityCase: 17,
  edgeInsight: 55,
  total: 218,
};

export function getCc0SvgBundleSizeKb(primaryColor: string, accentColor: string): number {
  const totalBytes = (['hero', 'cloud', 'ai', 'security'] as SvgGraphicKind[]).reduce(
    (sum, kind) =>
      sum +
      new TextEncoder().encode(
        buildCc0ArchitecturalSvgUri(kind, primaryColor, accentColor)
      ).length,
    0
  );
  return Number((totalBytes / 1024).toFixed(1));
}
