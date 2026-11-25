import {
  CoreWebVitalMetric,
  CoreWebVitalRating,
  PerfFixActionId,
  PerfOptimizationSuggestion,
  PerformanceSimulationReport,
  PerfSimulationProfile,
  SiteConfig,
} from '../types/template';
import {
  getCc0SvgBundleSizeKb,
  WEBP_ASSET_SIZES_KB,
} from './lightweightAssets';

interface NetworkProfileSpec {
  label: string;
  networkLabel: string;
  rttMs: number;
  throughputKbps: number; // KB per second
  cpuMultiplier: number;
  baseTtfbMs: number;
}

const PROFILE_SPECS: Record<PerfSimulationProfile, NetworkProfileSpec> = {
  'mobile-4g': {
    label: 'Mobile (Slow 4G)',
    networkLabel: '1.6 Mbps · 150ms RTT · 4× CPU',
    rttMs: 150,
    throughputKbps: 200,
    cpuMultiplier: 4,
    baseTtfbMs: 420,
  },
  'tablet-wifi': {
    label: 'Tablet (Fast 4G / Wi-Fi)',
    networkLabel: '6 Mbps · 60ms RTT · 2× CPU',
    rttMs: 60,
    throughputKbps: 750,
    cpuMultiplier: 2,
    baseTtfbMs: 240,
  },
  'desktop-fast': {
    label: 'Desktop (Broadband)',
    networkLabel: '20 Mbps · 25ms RTT · 1× CPU',
    rttMs: 25,
    throughputKbps: 2500,
    cpuMultiplier: 1,
    baseTtfbMs: 140,
  },
};

function byteLengthKb(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return Number((bytes / 1024).toFixed(1));
}

function rateVital(
  value: number,
  goodThreshold: number,
  poorThreshold: number
): CoreWebVitalRating {
  if (value <= goodThreshold) return 'good';
  if (value <= poorThreshold) return 'needs-improvement';
  return 'poor';
}

function scoreMetric(
  value: number,
  ideal: number,
  good: number,
  poor: number
): number {
  if (value <= ideal) return 100;
  if (value <= good) {
    const ratio = (value - ideal) / Math.max(0.0001, good - ideal);
    return Math.round(100 - ratio * 15);
  }
  if (value <= poor) {
    const ratio = (value - good) / Math.max(0.0001, poor - good);
    return Math.round(85 - ratio * 35);
  }
  const overRatio = Math.min(1, (value - poor) / Math.max(0.0001, poor));
  return Math.max(10, Math.round(50 - overRatio * 40));
}

export function simulateBloggerXmlPerformance(
  xml: string,
  config: SiteConfig,
  profile: PerfSimulationProfile = 'mobile-4g'
): PerformanceSimulationReport {
  const spec = PROFILE_SPECS[profile];
  const xmlTotalKb = byteLengthKb(xml);

  // 1. Extract structural segments from actual generated XML
  const skinMatch = xml.match(/<b:skin><!\[CDATA\[([\s\S]*?)\]\]><\/b:skin>/i);
  const skinCssKb = skinMatch ? byteLengthKb(skinMatch[1]) : 0;

  const jsonLdMatches =
    xml.match(/<script\b[^>]*type=['"]application\/ld\+json['"][^>]*>[\s\S]*?<\/script>/gi) ||
    [];
  const jsonLdKb = byteLengthKb(jsonLdMatches.join(''));

  const inlineJsMatches =
    xml.match(/<script\b(?![^>]*application\/ld\+json)(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) ||
    [];
  const inlineJsKb = byteLengthKb(inlineJsMatches.join(''));

  const markupKb = Math.max(
    1,
    Number((xmlTotalKb - skinCssKb - jsonLdKb - inlineJsKb).toFixed(1))
  );

  const xmlWithoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

  const preloadMatches =
    xmlWithoutCdata.match(/<link\b[^>]*rel=['"]preload['"][^>]*>/gi) || [];
  const preloadCount = preloadMatches.length;
  const hasPostImagePreload =
    /data:blog\.postImageUrl[\s\S]*?rel='preload'|rel='preload'[\s\S]*?data:blog\.postImageUrl/i.test(
      xmlWithoutCdata
    ) || xmlWithoutCdata.includes('expr:imagesrcset=');

  const hasPreconnectFonts =
    xmlWithoutCdata.includes('https://fonts.googleapis.com') &&
    xmlWithoutCdata.includes("rel='preconnect'");
  const hasFontDisplaySwap = xmlWithoutCdata.includes('display=swap');
  const fontFamilyCount =
    config.skin.headingFont === config.skin.bodyFont ? 1 : 2;

  const directImgs = xmlWithoutCdata.match(/<img\b[^>]*>/gi) || [];
  const encodedImgs = xmlWithoutCdata.match(/&lt;img\b[\s\S]*?&gt;/gi) || [];
  const allImgs = [...directImgs, ...encodedImgs];

  const imgsWithDimensions = allImgs.filter(
    (tag) =>
      /\bwidth=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag) &&
      /\bheight=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag)
  );
  const imgsWithLazy = allImgs.filter((tag) =>
    /\bloading=(?:'|"|&quot;)lazy(?:'|"|&quot;)/i.test(tag)
  );
  const imgsWithAsync = allImgs.filter((tag) =>
    /\bdecoding=(?:'|"|&quot;)async(?:'|"|&quot;)/i.test(tag)
  );

  const avifWebpPictureCount = (
    xmlWithoutCdata.match(/<picture\b[^>]*data-ez-responsive-picture=['"]true['"]/gi) ||
    []
  ).length;
  const hasAvifWebpSources =
    xmlWithoutCdata.includes("type='image/avif'") &&
    xmlWithoutCdata.includes("type='image/webp'");

  const externalBlockingScripts = (
    xmlWithoutCdata.match(/<script\b[^>]*\bsrc=[^>]*>/gi) || []
  ).filter((tag) => !/\b(?:defer|async)\b/i.test(tag)).length;

  const hasXmlComments = /<!--/.test(xmlWithoutCdata);

  // Estimate rendered homepage DOM nodes (exclude Blogger template control/data tags & multi-branch duplication)
  const htmlTagMatches =
    xmlWithoutCdata.match(/<(?!b:|data:|Variable\b|Group\b)[a-z][a-z0-9-]*\b/gi) || [];
  const domNodeEstimate = Math.round(
    htmlTagMatches.length * 0.55 +
      config.homepageBlogLimit * 14 +
      config.services.length * 8 +
      config.caseStudies.length * 10
  );

  const isInlineSvg = config.imageDeliveryMode === 'inline-svg';
  const mediaPayloadKb = isInlineSvg
    ? getCc0SvgBundleSizeKb(
        config.skin.primaryBrandColor,
        config.skin.accentColor
      )
    : Number((WEBP_ASSET_SIZES_KB.total + config.homepageBlogLimit * 14).toFixed(1));

  // 2. Simulate LCP (seconds)
  // Blogger gzip transfer ratio (~0.27x for XML/CSS)
  const gzippedHtmlKb = xmlTotalKb * 0.27;
  const htmlTransferMs = (gzippedHtmlKb / spec.throughputKbps) * 1000;
  const cssParseMs = skinCssKb * 1.4 * spec.cpuMultiplier;
  const fontHandshakeMs =
    (hasPreconnectFonts ? spec.rttMs * 0.6 : spec.rttMs * 1.8) +
    fontFamilyCount * (hasFontDisplaySwap ? 75 : 240);

  const heroTransferKb = isInlineSvg ? 0 : 42;
  const heroFetchMs = isInlineSvg
    ? 0
    : (preloadCount >= 2 ? spec.rttMs * 0.8 : spec.rttMs * 2.2) +
      (heroTransferKb / spec.throughputKbps) * 1000;

  const unminifiedPenaltyMs = hasXmlComments ? 95 * (spec.cpuMultiplier / 2) : 0;
  const preloadDiscoveryPenaltyMs =
    preloadCount >= 2 ? 0 : 280 + spec.rttMs * 0.9;
  const homeDensityMs = Math.max(0, config.homepageBlogLimit - 3) * 55;
  const blockingScriptPenaltyMs = externalBlockingScripts * (spec.rttMs * 2 + 220);

  const lcpMs =
    spec.baseTtfbMs +
    htmlTransferMs +
    cssParseMs +
    fontHandshakeMs +
    heroFetchMs +
    unminifiedPenaltyMs +
    preloadDiscoveryPenaltyMs +
    homeDensityMs +
    blockingScriptPenaltyMs;
  const lcpSeconds = Number((lcpMs / 1000).toFixed(2));
  const lcpRating = rateVital(lcpSeconds, 2.5, 4.0);

  const lcpDriver = !isInlineSvg
    ? 'External WebP hero fetch & RTT handshake'
    : preloadCount < 2
    ? 'Critical LCP preload hints disabled'
    : fontFamilyCount > 1
    ? 'Dual Google Font families on initial paint'
    : 'Zero-request CC0 SVG & preloaded LCP assets';

  // 3. Simulate FID (milliseconds)
  const htmlParseMainThreadMs = (domNodeEstimate / 60) * spec.cpuMultiplier;
  const jsEvalMs = (inlineJsKb * 1.8 + 3) * spec.cpuMultiplier;
  const blockingJsFidMs = externalBlockingScripts * 48 * spec.cpuMultiplier;
  const missingAsyncPenaltyMs =
    (allImgs.length - imgsWithAsync.length) * 6 * spec.cpuMultiplier;
  const unminifiedFidMs = hasXmlComments ? 4 * spec.cpuMultiplier : 0;

  const fidMs = Math.max(
    8,
    Math.round(
      htmlParseMainThreadMs +
        jsEvalMs +
        blockingJsFidMs +
        missingAsyncPenaltyMs +
        unminifiedFidMs
    )
  );
  const fidRating = rateVital(fidMs, 100, 300);

  const fidDriver =
    externalBlockingScripts > 0
      ? `${externalBlockingScripts} render-blocking external script(s)`
      : config.homepageBlogLimit > 4
      ? `Higher initial DOM density (~${domNodeEstimate} nodes)`
      : `Zero-dependency inline JS (${inlineJsKb} KB) with async decoding`;

  // 4. Simulate CLS (unitless score)
  const missingDimImgs = Math.max(0, allImgs.length - imgsWithDimensions.length);
  const imgShift = missingDimImgs * 0.065;
  const fontSwapShift = hasFontDisplaySwap
    ? fontFamilyCount === 1
      ? 0.008
      : 0.022
    : 0.085;
  const preloadShift = preloadCount >= 2 ? 0 : 0.018;
  const externalMediaShift = isInlineSvg ? 0.002 : 0.016;

  const clsScore = Number(
    Math.min(0.95, imgShift + fontSwapShift + preloadShift + externalMediaShift).toFixed(
      3
    )
  );
  const clsRating = rateVital(clsScore, 0.1, 0.25);

  const clsDriver =
    missingDimImgs > 0
      ? `${missingDimImgs} image(s) missing explicit width/height`
      : fontFamilyCount > 1
      ? 'Minor font-swap shift across 2 webfont families'
      : 'All images dimension-locked with single webfont family';

  // 5. Composite Lighthouse-style Score (0–100)
  const lcpScore = scoreMetric(lcpSeconds, 1.1, 2.5, 4.0);
  const fidScore = scoreMetric(fidMs, 25, 100, 300);
  const clsSubScore = scoreMetric(clsScore, 0.01, 0.1, 0.25);
  const payloadScore = scoreMetric(xmlTotalKb, 85, 110, 180);

  const overallScore = Math.round(
    lcpScore * 0.45 + fidScore * 0.25 + clsSubScore * 0.2 + payloadScore * 0.1
  );
  const overallRating: CoreWebVitalRating =
    overallScore >= 90
      ? 'good'
      : overallScore >= 65
      ? 'needs-improvement'
      : 'poor';

  // 6. Actionable Optimization Suggestions
  const suggestions: PerfOptimizationSuggestion[] = [];

  // S1: Preload Critical Assets
  const preloadOk = config.preloadCriticalAssets && preloadCount >= 2;
  suggestions.push({
    id: 'perf-opt-preload',
    category: 'LCP',
    title: 'Critical LCP Image Preloading (Logo, Hero & Post Featured Image)',
    status: preloadOk ? 'pass' : 'opportunity',
    estimatedSavings: preloadOk ? 'Active' : 'Saves ~320–420ms LCP',
    evidence: preloadOk
      ? `${preloadCount} <link rel="preload" as="image" fetchpriority="high"> hints active${hasPostImagePreload ? ' including responsive data:blog.postImageUrl imagesrcset' : ''}.`
      : 'Critical image preload links are disabled in <head>, delaying hero discovery until CSS/HTML layout completes.',
    recommendation: preloadOk
      ? 'Browser discovers hero and post featured images during initial HTML parsing.'
      : 'Enable Preload Critical Assets to inject high-priority preload hints for the brand logo, homepage hero, and single-post featured image.',
    impact: 'High',
    fixActionId: preloadOk ? undefined : 'enable-preload',
    fixActionLabel: preloadOk ? undefined : 'Enable Critical Preloads',
  });

  // S2: Minify XML Output
  const minifyOk = config.minifyXml && !hasXmlComments;
  suggestions.push({
    id: 'perf-opt-minify',
    category: 'Payload',
    title: 'XML Document Minification & Comment Stripping',
    status: minifyOk ? 'pass' : 'opportunity',
    estimatedSavings: minifyOk ? 'Active' : 'Saves ~14–16 KB (~15% HTML)',
    evidence: minifyOk
      ? `Minified Blogger XML (${xmlTotalKb} KB) with 0 non-variable XML comments.`
      : `Unminified template (${xmlTotalKb} KB) retains formatting whitespace and developer comments outside CDATA.`,
    recommendation: minifyOk
      ? 'Compact document payload lowers TTFB and HTML tokenization work while preserving Theme Designer variables.'
      : 'Enable Minify XML Output to strip comments and redundant whitespace before uploading to Blogger.',
    impact: 'Medium',
    fixActionId: minifyOk ? undefined : 'enable-minify',
    fixActionLabel: minifyOk ? undefined : 'Minify XML Output',
  });

  // S3: Lightweight Zero-Request Media Mode
  suggestions.push({
    id: 'perf-opt-media',
    category: 'LCP',
    title: 'Zero-Request CC0 Inline SVG vs. External WebP CDN Assets',
    status: isInlineSvg ? 'pass' : 'opportunity',
    estimatedSavings: isInlineSvg ? '0 extra RTTs' : 'Saves ~350ms LCP & 140+ KB',
    evidence: isInlineSvg
      ? `Inline CC0 SVG architectural artwork active (${mediaPayloadKb} KB total, zero extra DNS/TLS image handshakes).`
      : `External WebP CDN mode active (~${mediaPayloadKb} KB external media transfer across hero and case studies).`,
    recommendation: isInlineSvg
      ? 'Embedded CC0 SVGs render synchronously with the HTML document for instant hero paint.'
      : 'Switch to CC0 Inline SVG to eliminate external hero/case-study network round trips and prevent broken-asset CLS.',
    impact: 'High',
    fixActionId: isInlineSvg ? undefined : 'switch-inline-svg',
    fixActionLabel: isInlineSvg ? undefined : 'Switch to CC0 Inline SVG',
  });

  // S4: Single Unified Webfont Family
  const unifiedFonts = fontFamilyCount === 1;
  suggestions.push({
    id: 'perf-opt-fonts',
    category: 'CLS',
    title: 'Consolidate Heading & Body Webfont Families',
    status: unifiedFonts ? 'pass' : 'opportunity',
    estimatedSavings: unifiedFonts ? '1 font family' : 'Saves ~80–150ms & -0.014 CLS',
    evidence: unifiedFonts
      ? `Single Google Font family (${config.skin.headingFont}) loaded with rel="preconnect" and font-display: swap.`
      : `Loading 2 separate Google Font families (${config.skin.headingFont} + ${config.skin.bodyFont}), increasing font download weight and FOUT shift.`,
    recommendation: unifiedFonts
      ? 'Using one variable/multi-weight family minimizes font swap reflows and stylesheet size.'
      : 'Unify heading and body typography onto Plus Jakarta Sans (or Manrope) to halve font requests and tighten CLS.',
    impact: 'Medium',
    fixActionId: unifiedFonts ? undefined : 'unify-fonts',
    fixActionLabel: unifiedFonts ? undefined : 'Unify to 1 Font Family',
  });

  // S5: Homepage Feed DOM Budget (3 vs 4–6 posts)
  const compactHomeFeed = config.homepageBlogLimit <= 3;
  suggestions.push({
    id: 'perf-opt-dom-budget',
    category: 'FID',
    title: 'Homepage Blog Feed DOM & Card Budget',
    status: compactHomeFeed ? 'pass' : 'opportunity',
    estimatedSavings: compactHomeFeed
      ? 'Optimal (~3 cards)'
      : `Saves ~${(config.homepageBlogLimit - 3) * 14} DOM nodes`,
    evidence: `Homepage renders ${config.homepageBlogLimit} recent blog cards (~${domNodeEstimate} estimated DOM nodes) while full archive lives on ${config.blogsPagePath}.`,
    recommendation: compactHomeFeed
      ? 'Capping the homepage at 3 recent blogs keeps initial DOM size lean while routing full archive browsing to the separate Blogs page.'
      : 'Trim the homepage feed back to 3 recent blogs for fastest mobile hydration and lowest initial DOM footprint.',
    impact: 'Low',
    fixActionId: compactHomeFeed ? undefined : 'trim-home-blogs',
    fixActionLabel: compactHomeFeed ? undefined : 'Set Homepage to 3 Blogs',
  });

  // S6: Responsive WebP/AVIF Picture Delivery
  const avifWebpOk = avifWebpPictureCount > 0 && hasAvifWebpSources;
  suggestions.push({
    id: 'perf-opt-avif-webp',
    category: 'LCP',
    title: 'Responsive <picture> AVIF/WebP Format Switching & srcset',
    status: avifWebpOk ? 'pass' : 'opportunity',
    estimatedSavings: avifWebpOk ? '25–45% smaller post images' : 'Enable AVIF/WebP',
    evidence: `${avifWebpPictureCount} adaptive <picture> blocks with image/avif, image/webp, responsive srcset widths, and runtime browser format detection.`,
    recommendation:
      'Keep responsive AVIF/WebP switching active so mobile visitors download 480w/360w modern formats instead of oversized desktop PNG/JPEG uploads.',
    impact: 'High',
  });

  // S7: Explicit Dimensions, Lazy Loading & Async Decoding
  const imgsOk =
    allImgs.length > 0 &&
    imgsWithDimensions.length === allImgs.length &&
    imgsWithLazy.length === allImgs.length &&
    imgsWithAsync.length === allImgs.length;
  suggestions.push({
    id: 'perf-opt-img-attrs',
    category: 'CLS',
    title: 'Explicit Image Dimensions, Lazy Loading & Async Decoding',
    status: imgsOk ? 'pass' : 'opportunity',
    estimatedSavings: imgsOk ? '0.000 image CLS' : 'Prevents layout shift',
    evidence: `${imgsWithDimensions.length}/${allImgs.length} images have width/height, ${imgsWithLazy.length}/${allImgs.length} lazy-load, ${imgsWithAsync.length}/${allImgs.length} decode asynchronously.`,
    recommendation:
      'Every template image reserves exact aspect-ratio space before load, preventing Cumulative Layout Shift spikes.',
    impact: 'High',
  });

  // S8: Zero External Render-Blocking Scripts
  const zeroBlockingOk = externalBlockingScripts === 0;
  suggestions.push({
    id: 'perf-opt-zero-blocking',
    category: 'FID',
    title: 'Zero Render-Blocking External JS / Icon Frameworks',
    status: zeroBlockingOk ? 'pass' : 'opportunity',
    estimatedSavings: zeroBlockingOk ? '0 blocking requests' : 'Eliminates main-thread stall',
    evidence: `${externalBlockingScripts} render-blocking external scripts detected; total inline runtime JS is ${inlineJsKb} KB (vanilla ES5-safe CDATA).`,
    recommendation:
      'Avoiding jQuery, Bootstrap, and external icon fonts keeps First Input Delay well under Google’s 100ms threshold even on mid-tier mobile CPUs.',
    impact: 'High',
  });

  const passedCount = suggestions.filter((s) => s.status === 'pass').length;
  const opportunityCount = suggestions.length - passedCount;

  const lcp: CoreWebVitalMetric = {
    id: 'lcp',
    name: 'Largest Contentful Paint',
    shortLabel: 'LCP',
    value: lcpSeconds,
    displayValue: `${lcpSeconds.toFixed(2)}s`,
    unit: 's',
    goodThreshold: 2.5,
    poorThreshold: 4.0,
    goodTargetLabel: 'Good <= 2.5s',
    rating: lcpRating,
    primaryDriver: lcpDriver,
  };

  const fid: CoreWebVitalMetric = {
    id: 'fid',
    name: 'First Input Delay',
    shortLabel: 'FID',
    value: fidMs,
    displayValue: `${fidMs}ms`,
    unit: 'ms',
    goodThreshold: 100,
    poorThreshold: 300,
    goodTargetLabel: 'Good <= 100ms',
    rating: fidRating,
    primaryDriver: fidDriver,
  };

  const cls: CoreWebVitalMetric = {
    id: 'cls',
    name: 'Cumulative Layout Shift',
    shortLabel: 'CLS',
    value: clsScore,
    displayValue: clsScore.toFixed(3),
    unit: '',
    goodThreshold: 0.1,
    poorThreshold: 0.25,
    goodTargetLabel: 'Good <= 0.100',
    rating: clsRating,
    primaryDriver: clsDriver,
  };

  return {
    profile,
    profileLabel: spec.label,
    networkLabel: spec.networkLabel,
    overallScore,
    overallRating,
    lcp,
    fid,
    cls,
    breakdown: {
      xmlTotalKb,
      skinCssKb,
      inlineJsKb,
      jsonLdKb,
      markupKb,
      mediaPayloadKb,
      domNodeEstimate,
      preloadCount,
      avifWebpPictureCount,
      fontFamilyCount,
      externalBlockingScripts,
    },
    passedCount,
    opportunityCount,
    suggestions,
  };
}

export function applyPerformanceFixesToConfig(
  prev: SiteConfig,
  fixIds: PerfFixActionId[]
): SiteConfig {
  let next: SiteConfig = {
    ...prev,
    skin: { ...prev.skin },
  };

  for (const fixId of fixIds) {
    if (fixId === 'enable-minify') {
      next = { ...next, minifyXml: true };
    } else if (fixId === 'enable-preload') {
      next = { ...next, preloadCriticalAssets: true };
    } else if (fixId === 'switch-inline-svg') {
      next = { ...next, imageDeliveryMode: 'inline-svg' };
    } else if (fixId === 'unify-fonts') {
      // Plus Jakarta Sans and Manrope are valid in both HeadingFontOption and BodyFontOption
      const sharedFont =
        next.skin.headingFont === 'Manrope' ? 'Manrope' : 'Plus Jakarta Sans';
      next = {
        ...next,
        skin: {
          ...next.skin,
          headingFont: sharedFont,
          bodyFont: sharedFont,
        },
      };
    } else if (fixId === 'trim-home-blogs') {
      next = { ...next, homepageBlogLimit: 3 };
    }
  }

  return next;
}
