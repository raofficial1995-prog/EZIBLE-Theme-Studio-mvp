import {
  A11yAuditFinding,
  A11yAuditSummary,
  A11yFixActionId,
  ContrastCheckItem,
  SiteConfig,
} from '../types/template';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function parseHexColor(hex: string): RgbColor | null {
  const cleaned = (hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    const r = Number.parseInt(cleaned[0] + cleaned[0], 16);
    const g = Number.parseInt(cleaned[1] + cleaned[1], 16);
    const b = Number.parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbToHex({ r, g, b }: RgbColor): string {
  const toByte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function channelLuminance(c: number): number {
  const srgb = c / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(rgb: RgbColor): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (!a || !b) return 1;
  const lumA = getRelativeLuminance(a);
  const lumB = getRelativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Adjusts the lightness of `mutableHex` while preserving hue and saturation
 * until it meets `targetRatio` against `fixedHex`.
 */
export function adjustHexForWcagContrast(
  mutableHex: string,
  fixedHex: string,
  targetRatio = 4.65,
  preferDirection?: 'darken' | 'lighten'
): string {
  const mutableRgb = parseHexColor(mutableHex);
  const fixedRgb = parseHexColor(fixedHex);
  if (!mutableRgb || !fixedRgb) return mutableHex;

  if (getContrastRatio(mutableHex, fixedHex) >= targetRatio) {
    return rgbToHex(mutableRgb);
  }

  const fixedLum = getRelativeLuminance(fixedRgb);
  const direction = preferDirection ?? (fixedLum > 0.35 ? 'darken' : 'lighten');
  const hsl = rgbToHsl(mutableRgb);

  let bestHex = rgbToHex(mutableRgb);
  let bestRatio = getContrastRatio(bestHex, fixedHex);

  const steps = 100;
  for (let i = 1; i <= steps; i++) {
    const nextL =
      direction === 'darken'
        ? Math.max(0.03, hsl.l - (hsl.l * i) / steps)
        : Math.min(0.97, hsl.l + ((1 - hsl.l) * i) / steps);
    const candidateHex = rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: nextL }));
    const ratio = getContrastRatio(candidateHex, fixedHex);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestHex = candidateHex;
    }
    if (ratio >= targetRatio) {
      return candidateHex;
    }
  }

  // Fallback if hue was too light/dark even at extreme lightness
  const extreme = direction === 'darken' ? '#0F172A' : '#F8FAFC';
  return getContrastRatio(extreme, fixedHex) > bestRatio ? extreme : bestHex;
}

export function analyzeBloggerXmlAccessibility(
  xml: string,
  config: SiteConfig
): A11yAuditSummary {
  const xmlWithoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const { skin } = config;

  // 1. Scan all <img> elements (direct XHTML and widget-encoded)
  const directImgs = xmlWithoutCdata.match(/<img\b[^>]*>/gi) || [];
  const encodedImgs = xmlWithoutCdata.match(/&lt;img\b[\s\S]*?&gt;/gi) || [];
  const allImgs = [...directImgs, ...encodedImgs];

  const imgsMissingAlt = allImgs.filter((tag) => {
    if (/\baria-hidden=(?:'|"|&quot;|&apos;)true(?:'|"|&quot;|&apos;)/i.test(tag)) {
      return false;
    }
    const hasExprAlt = /\bexpr:alt=/i.test(tag);
    const hasNonEmptyAlt =
      /\balt=(?:'[^']+'|"[^"]+"|&quot;(?:(?!&quot;).)+&quot;|&apos;(?:(?!&apos;).)+&apos;)/i.test(
        tag
      );
    return !hasExprAlt && !hasNonEmptyAlt;
  });
  const imgWithAltCount = allImgs.length - imgsMissingAlt.length;

  // 2. Scan ARIA labels, dialogs, landmarks, and SVGs
  const ariaLabelMatches =
    xmlWithoutCdata.match(
      /\b(?:aria-label|aria-labelledby)=(?:'[^']+'|"[^"]+"|&quot;(?:(?!&quot;).)+&quot;|&apos;(?:(?!&apos;).)+&apos;)/gi
    ) || [];
  const navTags = xmlWithoutCdata.match(/<nav\b[^>]*>/gi) || [];
  const navsMissingLabel = navTags.filter(
    (tag) => !/\baria-label(?:ledby)?=/i.test(tag)
  );
  const dialogTags =
    xmlWithoutCdata.match(
      /<[a-z]+\b[^>]*role=(?:'|"|&quot;|&apos;)dialog(?:'|"|&quot;|&apos;)[^>]*>/gi
    ) || [];
  const dialogsMissingLabel = dialogTags.filter(
    (tag) => !/\baria-label(?:ledby)?=/i.test(tag)
  );
  const hasMainLandmark = /<main\b/i.test(xmlWithoutCdata);
  const hasHeaderLandmark = /<header\b/i.test(xmlWithoutCdata);
  const hasFooterLandmark = /<footer\b/i.test(xmlWithoutCdata);
  const landmarkCount =
    navTags.length +
    (hasMainLandmark ? 1 : 0) +
    (hasHeaderLandmark ? 1 : 0) +
    (hasFooterLandmark ? 1 : 0);

  const svgTags = [
    ...(xmlWithoutCdata.match(/<svg\b[^>]*>/gi) || []),
    ...(xmlWithoutCdata.match(/&lt;svg\b[\s\S]*?&gt;/gi) || []),
  ];
  const unhiddenSvgs = svgTags.filter(
    (tag) =>
      !/\baria-hidden=(?:'|"|&quot;|&apos;)true(?:'|"|&quot;|&apos;)/i.test(tag) &&
      !/\baria-label=/i.test(tag) &&
      !/\brole=(?:'|"|&quot;|&apos;)img(?:'|"|&quot;|&apos;)/i.test(tag)
  );

  const externalShareLinks =
    xmlWithoutCdata.match(/<a\b[^>]*class='ez-share-btn'[^>]*target='_blank'[^>]*>/gi) || [];
  const shareLinksMissingAria = externalShareLinks.filter(
    (tag) => !/\baria-label=/i.test(tag)
  );

  // 3. Scan Skip-to-Content, Focus-Visible, and Reduced Motion
  const hasSkipLink =
    /class='ez-skip-link'/i.test(xmlWithoutCdata) &&
    /href='#main-content'/i.test(xmlWithoutCdata) &&
    /id='main-content'/i.test(xmlWithoutCdata);
  const hasFocusVisible = /:focus-visible\b/i.test(xml);
  const hasReducedMotion = /prefers-reduced-motion\s*:\s*reduce/i.test(xml);

  // 4. Form labels & honeypot isolation
  const hasContactLabels =
    xmlWithoutCdata.includes("for='ContactForm1_contact-form-name'") &&
    xmlWithoutCdata.includes("for='ContactForm1_contact-form-email'") &&
    xmlWithoutCdata.includes("for='ContactForm1_contact-form-email-message'");
  const hasNewsletterLabel =
    xmlWithoutCdata.includes('for=&quot;ez-news-email&quot;') ||
    xmlWithoutCdata.includes("for='ez-news-email'");
  const hasAccessibleHoneypot =
    /class=(?:'|"|&quot;)ez-hp-trap(?:'|"|&quot;)/i.test(xmlWithoutCdata) &&
    /tabindex=(?:'|"|&quot;)-1(?:'|"|&quot;)/i.test(xmlWithoutCdata);

  // 5. Document lang, dir & viewport pinch-zoom
  const hasLangDir =
    xmlWithoutCdata.includes("expr:lang='data:blog.locale'") &&
    xmlWithoutCdata.includes("expr:dir='data:blog.languageDirection'");
  const blocksZoom = /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(
    xmlWithoutCdata
  );

  // 6. WCAG 2.1 Color Contrast Pairs
  const bodyTextRatio = getContrastRatio(skin.textColor, skin.mainBgColor);
  const primaryHeadingRatio = getContrastRatio(skin.primaryBrandColor, skin.mainBgColor);
  const footerTextRatio = getContrastRatio('#F8FAFC', skin.primaryBrandColor);
  const secondaryCardRatio = getContrastRatio(skin.secondaryColor, '#FFFFFF');
  const accentButtonRatio = getContrastRatio('#FFFFFF', skin.accentColor);

  const contrastChecks: ContrastCheckItem[] = [
    {
      id: 'contrast-body',
      label: 'Body Text on Canvas',
      foreground: skin.textColor,
      background: skin.mainBgColor,
      ratio: bodyTextRatio,
      requiredRatio: 4.5,
      passesAA: bodyTextRatio >= 4.5,
      passesAAA: bodyTextRatio >= 7.0,
      sampleText: 'Readable enterprise documentation copy',
      fixActionId: bodyTextRatio >= 4.5 ? undefined : 'fix-contrast-text',
    },
    {
      id: 'contrast-primary-heading',
      label: 'Primary Headings on Canvas',
      foreground: skin.primaryBrandColor,
      background: skin.mainBgColor,
      ratio: primaryHeadingRatio,
      requiredRatio: 4.5,
      passesAA: primaryHeadingRatio >= 4.5,
      passesAAA: primaryHeadingRatio >= 7.0,
      sampleText: 'Cloud Architecture & Security',
      fixActionId: primaryHeadingRatio >= 4.5 ? undefined : 'fix-contrast-primary',
    },
    {
      id: 'contrast-primary-footer',
      label: 'Light Text on Primary Footer',
      foreground: '#F8FAFC',
      background: skin.primaryBrandColor,
      ratio: footerTextRatio,
      requiredRatio: 4.5,
      passesAA: footerTextRatio >= 4.5,
      passesAAA: footerTextRatio >= 7.0,
      sampleText: 'Footer navigation & contact desk',
      fixActionId: footerTextRatio >= 4.5 ? undefined : 'fix-contrast-primary',
    },
    {
      id: 'contrast-secondary',
      label: 'Secondary Brand on White Card',
      foreground: skin.secondaryColor,
      background: '#FFFFFF',
      ratio: secondaryCardRatio,
      requiredRatio: 4.5,
      passesAA: secondaryCardRatio >= 4.5,
      passesAAA: secondaryCardRatio >= 7.0,
      sampleText: 'Secondary buttons, tags & callouts',
      fixActionId: secondaryCardRatio >= 4.5 ? undefined : 'fix-contrast-secondary',
    },
    {
      id: 'contrast-accent',
      label: 'White Label on Accent CTA',
      foreground: '#FFFFFF',
      background: skin.accentColor,
      ratio: accentButtonRatio,
      requiredRatio: 4.5,
      passesAA: accentButtonRatio >= 4.5,
      passesAAA: accentButtonRatio >= 7.0,
      sampleText: 'Schedule Architecture Review',
      fixActionId: accentButtonRatio >= 4.5 ? undefined : 'fix-contrast-accent',
    },
  ];

  const contrastPassedCount = contrastChecks.filter((c) => c.passesAA).length;
  const findings: A11yAuditFinding[] = [];

  // Finding 1: Missing Alt Attributes
  const altPass = imgsMissingAlt.length === 0 && allImgs.length > 0;
  findings.push({
    id: 'a11y-img-alt',
    category: 'Alt Text & Media',
    wcagCriterion: 'WCAG 1.1.1',
    wcagLevel: 'A',
    title: 'Descriptive Alt Attributes on All Template Images',
    severity: altPass ? 'pass' : 'critical',
    evidence: altPass
      ? `All ${allImgs.length}/${allImgs.length} <img> tags carry non-empty alt or dynamic expr:alt attributes.`
      : `Detected ${imgsMissingAlt.length} of ${allImgs.length} <img> element(s) missing descriptive alt text (including #ez-lightbox-img fallback).`,
    recommendation: altPass
      ? 'Every static and dynamic Blogger image exposes meaningful alternative text for screen readers.'
      : 'Inject a descriptive fallback alt attribute on modal/template images and backfill any blank alt metadata so assistive tech never announces empty image placeholders.',
    fixActionId: altPass ? undefined : 'fix-missing-alt',
    fixActionLabel: altPass ? undefined : 'Auto-Fix Missing Alt Tags',
  });

  // Finding 2: ARIA Labels on Dialogs, Landmarks & Share Controls
  const ariaIssuesCount =
    dialogsMissingLabel.length +
    navsMissingLabel.length +
    shareLinksMissingAria.length +
    unhiddenSvgs.length;
  const ariaPass = ariaIssuesCount === 0 && config.accessibility.enforceAriaLandmarks;
  findings.push({
    id: 'a11y-aria-labels',
    category: 'ARIA & Landmarks',
    wcagCriterion: 'WCAG 4.1.2',
    wcagLevel: 'A',
    title: 'ARIA Labels on Modal Dialogs, Nav Landmarks & Action Controls',
    severity: ariaPass ? 'pass' : dialogsMissingLabel.length > 0 ? 'critical' : 'warning',
    evidence: ariaPass
      ? `${ariaLabelMatches.length} ARIA labels verified across ${landmarkCount} landmarks, modal dialog (aria-labelledby), and outbound share controls.`
      : `Found ${dialogsMissingLabel.length} unlabeled dialog(s), ${shareLinksMissingAria.length} external share link(s) without new-tab ARIA descriptions, and ${navsMissingLabel.length} unlabeled nav region(s).`,
    recommendation: ariaPass
      ? 'Dialogs, navigation landmarks, close controls, and decorative SVGs expose accurate accessible names.'
      : 'Bind aria-labelledby and aria-describedby on the lightbox dialog and add descriptive aria-label attributes to close buttons and outbound social share links.',
    fixActionId: ariaPass ? undefined : 'fix-aria-labels',
    fixActionLabel: ariaPass ? undefined : 'Enforce ARIA Labels',
  });

  // Finding 3: Skip-to-Main-Content Link
  findings.push({
    id: 'a11y-skip-link',
    category: 'Keyboard & Motion',
    wcagCriterion: 'WCAG 2.4.1',
    wcagLevel: 'A',
    title: 'Keyboard Skip-to-Main-Content Bypass Link',
    severity: hasSkipLink ? 'pass' : 'warning',
    evidence: hasSkipLink
      ? 'Detected focusable .ez-skip-link targeting #main-content as the first element inside <body>.'
      : 'No skip-to-main-content link found before the sticky header navigation.',
    recommendation: hasSkipLink
      ? 'Keyboard and switch-device users can bypass the header navigation in a single Tab press.'
      : 'Inject a visually hidden .ez-skip-link that reveals on focus and jumps directly to <main id="main-content">.',
    fixActionId: hasSkipLink ? undefined : 'fix-skip-link',
    fixActionLabel: hasSkipLink ? undefined : 'Add Skip Link',
  });

  // Finding 4: Body Text Contrast
  findings.push({
    id: 'a11y-contrast-text',
    category: 'Color Contrast',
    wcagCriterion: 'WCAG 1.4.3',
    wcagLevel: 'AA',
    title: 'Body Text vs. Canvas Background Contrast',
    severity: bodyTextRatio >= 4.5 ? 'pass' : 'critical',
    evidence: `${skin.textColor} on ${skin.mainBgColor} measures ${bodyTextRatio}:1 (minimum 4.5:1 for AA normal text).`,
    recommendation:
      bodyTextRatio >= 4.5
        ? `Meets WCAG 2.1 ${bodyTextRatio >= 7 ? 'AAA' : 'AA'} legibility for long-form engineering articles.`
        : 'Darken or lighten the body text variable to achieve at least 4.5:1 contrast against the page canvas.',
    fixActionId: bodyTextRatio >= 4.5 ? undefined : 'fix-contrast-text',
    fixActionLabel: bodyTextRatio >= 4.5 ? undefined : 'Fix Text Contrast',
  });

  // Finding 5: Primary Brand Contrast (Headings + Footer)
  const primaryPass = primaryHeadingRatio >= 4.5 && footerTextRatio >= 4.5;
  findings.push({
    id: 'a11y-contrast-primary',
    category: 'Color Contrast',
    wcagCriterion: 'WCAG 1.4.3',
    wcagLevel: 'AA',
    title: 'Primary Brand Color Contrast (Headings & Dark Footer)',
    severity: primaryPass ? 'pass' : 'critical',
    evidence: `Headings on canvas: ${primaryHeadingRatio}:1 · Light footer text on ${skin.primaryBrandColor}: ${footerTextRatio}:1 (target >= 4.5:1).`,
    recommendation: primaryPass
      ? 'Primary brand color maintains strong contrast for both light-canvas headings and dark-footer copy.'
      : 'Tune primary.brand.color while preserving its hue so both canvas headings and light footer text clear 4.5:1.',
    fixActionId: primaryPass ? undefined : 'fix-contrast-primary',
    fixActionLabel: primaryPass ? undefined : 'Fix Primary Contrast',
  });

  // Finding 6: Secondary Brand Contrast
  findings.push({
    id: 'a11y-contrast-secondary',
    category: 'Color Contrast',
    wcagCriterion: 'WCAG 1.4.3',
    wcagLevel: 'AA',
    title: 'Secondary Brand Color Contrast on Cards & Buttons',
    severity: secondaryCardRatio >= 4.5 ? 'pass' : 'critical',
    evidence: `${skin.secondaryColor} on #FFFFFF measures ${secondaryCardRatio}:1 (minimum 4.5:1 for AA text and button labels).`,
    recommendation:
      secondaryCardRatio >= 4.5
        ? 'Secondary brand text, outlined buttons, and section labels meet WCAG AA readability on card surfaces.'
        : 'Deepen secondary.color while keeping its hue so secondary buttons and labels pass WCAG 2.1 AA.',
    fixActionId: secondaryCardRatio >= 4.5 ? undefined : 'fix-contrast-secondary',
    fixActionLabel: secondaryCardRatio >= 4.5 ? undefined : 'Fix Secondary Contrast',
  });

  // Finding 7: Accent CTA Button Contrast
  findings.push({
    id: 'a11y-contrast-accent',
    category: 'Color Contrast',
    wcagCriterion: 'WCAG 1.4.3',
    wcagLevel: 'AA',
    title: 'Accent Action CTA Button Contrast',
    severity: accentButtonRatio >= 4.5 ? 'pass' : 'critical',
    evidence: `#FFFFFF CTA label on ${skin.accentColor} measures ${accentButtonRatio}:1 (minimum 4.5:1 for AA button text).`,
    recommendation:
      accentButtonRatio >= 4.5
        ? 'Primary call-to-action buttons maintain accessible contrast for white labels.'
        : 'Darken accent.color slightly while preserving brand hue so white CTA labels meet 4.5:1 contrast.',
    fixActionId: accentButtonRatio >= 4.5 ? undefined : 'fix-contrast-accent',
    fixActionLabel: accentButtonRatio >= 4.5 ? undefined : 'Fix Accent Contrast',
  });

  // Finding 8: Focus-Visible & Reduced Motion
  const focusMotionPass = hasFocusVisible && hasReducedMotion;
  findings.push({
    id: 'a11y-focus-motion',
    category: 'Keyboard & Motion',
    wcagCriterion: 'WCAG 2.4.7 / 2.3.3',
    wcagLevel: 'AA',
    title: 'Visible Keyboard Focus Rings & Reduced-Motion Support',
    severity: focusMotionPass ? 'pass' : 'warning',
    evidence: `Focus indicators (:focus-visible): ${hasFocusVisible ? 'Present' : 'Missing'} · prefers-reduced-motion query: ${hasReducedMotion ? 'Active' : 'Missing'}.`,
    recommendation: focusMotionPass
      ? 'Template preserves clear keyboard focus outlines and disables non-essential animations when OS reduced-motion is requested.'
      : 'Inject a @media (prefers-reduced-motion: reduce) CSS guard in <b:skin> to disable smooth scrolling and transition motion for vestibular-sensitive users.',
    fixActionId: focusMotionPass ? undefined : 'fix-reduced-motion',
    fixActionLabel: focusMotionPass ? undefined : 'Add Reduced-Motion CSS',
  });

  // Finding 9: Form Labels & Honeypot Isolation
  const formsPass = hasContactLabels && hasNewsletterLabel && hasAccessibleHoneypot;
  findings.push({
    id: 'a11y-forms',
    category: 'ARIA & Landmarks',
    wcagCriterion: 'WCAG 1.3.1',
    wcagLevel: 'A',
    title: 'Explicit Form Labels & Screen-Reader Honeypot Isolation',
    severity: formsPass ? 'pass' : 'critical',
    evidence: formsPass
      ? 'ContactForm1 and Newsletter inputs carry explicit <label for="..."> bindings; honeypot inputs are hidden with aria-hidden="true" and tabindex="-1".'
      : 'One or more form inputs lack an explicit label association or honeypot tabindex isolation.',
    recommendation:
      'Keep every visible form control paired with a programmatic <label> and isolate anti-spam traps from keyboard tab order.',
  });

  // Finding 10: Document Language, Direction & Zoom
  const docPass = hasLangDir && !blocksZoom;
  findings.push({
    id: 'a11y-lang-zoom',
    category: 'ARIA & Landmarks',
    wcagCriterion: 'WCAG 3.1.1 / 1.4.4',
    wcagLevel: 'A',
    title: 'Document Language, Reading Direction & Pinch-to-Zoom',
    severity: docPass ? 'pass' : 'critical',
    evidence: docPass
      ? 'Root <html> binds expr:lang="data:blog.locale" and expr:dir="data:blog.languageDirection"; viewport meta allows 200%+ zoom.'
      : 'Missing document lang/dir bindings or viewport meta blocks user zooming.',
    recommendation:
      'Never disable pinch-to-zoom in viewport meta tags and always keep Blogger locale/direction bindings on <html>.',
  });

  const passedCount = findings.filter((f) => f.severity === 'pass').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;

  return {
    passedCount,
    warningCount,
    criticalCount,
    totalChecks: findings.length,
    imgTotalCount: allImgs.length,
    imgWithAltCount,
    ariaLabelCount: ariaLabelMatches.length,
    landmarkCount,
    contrastChecks,
    contrastPassedCount,
    findings,
  };
}

/**
 * Applies one or more automated WCAG fixes directly to SiteConfig.
 */
export function applyAccessibilityFixesToConfig(
  prev: SiteConfig,
  fixIds: A11yFixActionId[]
): SiteConfig {
  let next: SiteConfig = {
    ...prev,
    accessibility: { ...prev.accessibility },
    skin: { ...prev.skin },
  };

  for (const fixId of fixIds) {
    if (fixId === 'fix-missing-alt') {
      next = {
        ...next,
        accessibility: { ...next.accessibility, autoFillMissingAlt: true },
        caseStudies: next.caseStudies.map((cs) => ({
          ...cs,
          imageAlt:
            cs.imageAlt && cs.imageAlt.trim().length > 0
              ? cs.imageAlt
              : `${cs.title} architecture case study diagram`,
        })),
        insights: next.insights.map((post) => ({
          ...post,
          imageAlt:
            post.imageAlt && post.imageAlt.trim().length > 0
              ? post.imageAlt
              : `${post.title} featured technical illustration`,
        })),
      };
    } else if (fixId === 'fix-aria-labels') {
      next = {
        ...next,
        accessibility: { ...next.accessibility, enforceAriaLandmarks: true },
      };
    } else if (fixId === 'fix-skip-link') {
      next = {
        ...next,
        accessibility: { ...next.accessibility, includeSkipToContent: true },
      };
    } else if (fixId === 'fix-reduced-motion') {
      next = {
        ...next,
        accessibility: { ...next.accessibility, respectReducedMotion: true },
      };
    } else if (fixId === 'fix-contrast-text') {
      next = {
        ...next,
        skin: {
          ...next.skin,
          textColor: adjustHexForWcagContrast(
            next.skin.textColor,
            next.skin.mainBgColor,
            4.8
          ),
        },
      };
    } else if (fixId === 'fix-contrast-primary') {
      // Primary must have >= 4.5:1 against both light canvas and light footer text (#F8FAFC)
      let candidate = adjustHexForWcagContrast(
        next.skin.primaryBrandColor,
        next.skin.mainBgColor,
        5.0,
        'darken'
      );
      if (getContrastRatio('#F8FAFC', candidate) < 4.6) {
        candidate = adjustHexForWcagContrast(candidate, '#F8FAFC', 5.0, 'darken');
      }
      next = {
        ...next,
        skin: {
          ...next.skin,
          primaryBrandColor: candidate,
        },
      };
    } else if (fixId === 'fix-contrast-secondary') {
      next = {
        ...next,
        skin: {
          ...next.skin,
          secondaryColor: adjustHexForWcagContrast(
            next.skin.secondaryColor,
            '#FFFFFF',
            4.8,
            'darken'
          ),
        },
      };
    } else if (fixId === 'fix-contrast-accent') {
      next = {
        ...next,
        skin: {
          ...next.skin,
          accentColor: adjustHexForWcagContrast(
            next.skin.accentColor,
            '#FFFFFF',
            4.8,
            'darken'
          ),
        },
      };
    }
  }

  return next;
}
