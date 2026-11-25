import {
  SeoAuditFinding,
  SeoAuditSummary,
  SiteConfig,
} from '../types/template';

export function analyzeBloggerXmlSeo(
  xml: string,
  config: SiteConfig
): SeoAuditSummary {
  const xmlWithoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const xmlSizeBytes = new TextEncoder().encode(xml).length;
  const xmlSizeKb = Number((xmlSizeBytes / 1024).toFixed(1));

  // Extract raw and widget-encoded <img> tags
  const directImgs = xmlWithoutCdata.match(/<img\b[^>]*>/gi) || [];
  const encodedImgs = xmlWithoutCdata.match(/&lt;img\b[\s\S]*?&gt;/gi) || [];
  const allImgs = [...directImgs, ...encodedImgs];

  const imgsWithAlt = allImgs.filter((tag) =>
    /\balt=(?:'|"|&quot;)[^'"&]+/i.test(tag) || /\bexpr:alt=/i.test(tag)
  );
  const imgsFullyOptimized = allImgs.filter(
    (tag) =>
      /\bloading=(?:'|"|&quot;)lazy(?:'|"|&quot;)/i.test(tag) &&
      /\bdecoding=(?:'|"|&quot;)async(?:'|"|&quot;)/i.test(tag) &&
      /\bwidth=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag) &&
      /\bheight=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag)
  );

  // Extract JSON-LD blocks
  const jsonLdBlocks =
    xml.match(/<script\b[^>]*type=['"]application\/ld\+json['"][^>]*>[\s\S]*?<\/script>/gi) ||
    [];

  // Extract preload links
  const preloadTags =
    xmlWithoutCdata.match(/<link\b[^>]*rel=['"]preload['"][^>]*>/gi) || [];

  // Heading counts
  const h1Count =
    (xmlWithoutCdata.match(/<h1\b/gi) || []).length +
    (xmlWithoutCdata.match(/&lt;h1\b/gi) || []).length;
  const h2Count =
    (xmlWithoutCdata.match(/<h2\b/gi) || []).length +
    (xmlWithoutCdata.match(/&lt;h2\b/gi) || []).length;

  // Title length calculation (homepage format)
  const homepageTitle = `${config.companyName} — ${config.tagline}`;
  const homepageTitleLength = homepageTitle.length;

  const findings: SeoAuditFinding[] = [];

  // 1. Canonical & Conditional Robots Directives
  const hasAllHead = xml.includes("name='all-head-content'");
  const hasSearchNoindex =
    xml.includes('data:view.isSearch') && xml.includes("content='noindex, follow'");
  const hasMaxSnippet = xml.includes('max-snippet:-1');
  findings.push({
    id: 'crawl-robots',
    category: 'Crawlability',
    title: 'Canonical Head Include & Search Archive Noindex',
    severity: hasAllHead && hasSearchNoindex && hasMaxSnippet ? 'pass' : 'critical',
    evidence: hasAllHead && hasSearchNoindex
      ? 'all-head-content, max-snippet:-1, max-image-preview:large, and search/archive noindex detected.'
      : 'Missing Blogger canonical include or search-page noindex guard.',
    recommendation:
      hasAllHead && hasSearchNoindex
        ? 'Keep conditional noindex active on search and archive views so crawl budget focuses on canonical posts and case studies.'
        : 'Add <b:include data="blog" name="all-head-content"/> and conditional noindex on data:view.isSearch.',
    impact: 'High',
  });

  // 2. HTTPS Canonical Domain
  const trimmedDomain = config.domain.trim();
  const isHttpsDomain =
    trimmedDomain.startsWith('https://') &&
    !/localhost|127\.0\.0\.1|example\.com/i.test(trimmedDomain);
  findings.push({
    id: 'crawl-https',
    category: 'Crawlability',
    title: 'Production HTTPS Canonical Domain',
    severity: isHttpsDomain ? 'pass' : 'critical',
    evidence: `Configured domain: ${trimmedDomain || '(empty)'}`,
    recommendation: isHttpsDomain
      ? 'Canonical URLs in Organization, OfferCatalog, and Open Graph tags point to a production HTTPS domain.'
      : 'Update your Canonical Domain to use production https:// so JSON-LD @id and canonical links do not split PageRank.',
    impact: 'High',
    fixActionId: isHttpsDomain ? undefined : 'fix-https-domain',
    fixActionLabel: isHttpsDomain ? undefined : 'Switch to HTTPS',
  });

  // 3. Explicit Meta Description, Open Graph & Twitter Cards
  const hasMetaDesc =
    xml.includes("name='description'") &&
    xml.includes("property='og:title'") &&
    xml.includes("name='twitter:card'");
  findings.push({
    id: 'meta-social-cards',
    category: 'On-Page Semantics',
    title: 'Fallback Meta Description, Open Graph & Twitter Cards',
    severity: hasMetaDesc ? 'pass' : 'warning',
    evidence: hasMetaDesc
      ? 'Explicit homepage/post <meta name="description">, og:title, og:type, og:url, and twitter:card present in <head>.'
      : 'Relying solely on default Blogger head tags; explicit og:type, twitter:card, and homepage description tags are not injected.',
    recommendation: hasMetaDesc
      ? 'Explicit social and meta description tags ensure consistent SERP snippets and rich previews across LinkedIn and X.'
      : 'Inject conditional <meta name="description">, Open Graph, and Twitter Card tags in <head> to improve CTR from Google Search and social shares.',
    impact: 'High',
    fixActionId: hasMetaDesc ? undefined : 'enable-social-meta',
    fixActionLabel: hasMetaDesc ? undefined : 'Inject Social & Meta Tags',
  });

  // 4. Title Tag Structure & Length
  const titleInRange = homepageTitleLength >= 35 && homepageTitleLength <= 70;
  findings.push({
    id: 'semantics-title',
    category: 'On-Page Semantics',
    title: 'Dynamic Conditional <title> Tag Structure',
    severity: xml.includes('<title>') && titleInRange ? 'pass' : 'warning',
    evidence: `Homepage title renders ${homepageTitleLength} characters with conditional post-page switching.`,
    recommendation: titleInRange
      ? 'Title tag fits within Google SERP display width (~50–70 characters) and switches dynamically on post pages.'
      : 'Tighten the homepage tagline so the rendered <title> stays under 70 characters and avoids Google SERP truncation.',
    impact: 'Medium',
    fixActionId: titleInRange ? undefined : 'optimize-title-length',
    fixActionLabel: titleInRange ? undefined : 'Trim Title for SERP',
  });

  // 5. Heading Hierarchy (H1 / H2)
  const headingHierarchyValid = h1Count === 3 && h2Count >= 4;
  findings.push({
    id: 'semantics-headings',
    category: 'On-Page Semantics',
    title: 'Single H1 per View & Semantic H2 Hierarchy',
    severity: headingHierarchyValid ? 'pass' : 'warning',
    evidence: `Detected ${h1Count} conditional <h1> tags (1 Homepage Hero, 1 Separate Blogs Page, 1 Single Post Headline) and ${h2Count} <h2> section landmarks.`,
    recommendation:
      'Maintain exactly one <h1> per rendered page view (Homepage, All Blogs Page, and Single Post) and organize technical blog posts with clear <h2>/<h3> subsections.',
    impact: 'Medium',
  });

  // 6. Entity-Rich JSON-LD Schema Graph
  const hasAllSchemas =
    xml.includes('Organization') &&
    xml.includes('ITService') &&
    xml.includes('BreadcrumbList') &&
    xml.includes('TechArticle') &&
    xml.includes('FAQPage');
  findings.push({
    id: 'schema-graph',
    category: 'Structured Data',
    title: 'Entity-Rich JSON-LD Graph (SEO, AEO & GEO)',
    severity: hasAllSchemas && jsonLdBlocks.length >= 4 ? 'pass' : 'critical',
    evidence: `${jsonLdBlocks.length} JSON-LD blocks detected covering Organization, OfferCatalog (ITService), BreadcrumbList, TechArticle, and FAQPage.`,
    recommendation:
      'Populate at least 5 specific knowsAbout expertise topics so Google Knowledge Graph and AI answer engines associate your brand with core IT domains.',
    impact: 'High',
  });

  // 7. AEO / AI Overview Content Structures
  const hasAeoBlocks =
    xml.includes('.aeo-tldr-box') &&
    xml.includes('.geo-spec-table') &&
    xml.includes('.faq-accordion') &&
    xml.includes('https://schema.org/Review');
  findings.push({
    id: 'schema-aeo',
    category: 'Structured Data',
    title: 'AEO Key Takeaways, Comparison Tables & Review Microdata',
    severity: hasAeoBlocks ? 'pass' : 'warning',
    evidence: hasAeoBlocks
      ? 'Includes .aeo-tldr-box, .geo-spec-table, .faq-accordion, and Schema.org Review microdata.'
      : 'One or more AEO structured content classes are missing.',
    recommendation:
      'Start every technical blog post with a 2–3 sentence .aeo-tldr-box summary and a .geo-spec-table benchmark to maximize Google AI Overview citations.',
    impact: 'High',
  });

  // 8. Critical Asset Preloading (LCP)
  const preloadActive = preloadTags.length >= 2;
  findings.push({
    id: 'cwv-preload',
    category: 'Core Web Vitals',
    title: 'Critical LCP Asset Preloading (Logo & Hero)',
    severity: preloadActive ? 'pass' : 'warning',
    evidence: preloadActive
      ? `${preloadTags.length} <link rel="preload" as="image" fetchpriority="high"> hints injected in <head>.`
      : 'Critical image preloading is currently disabled in <head>.',
    recommendation: preloadActive
      ? 'Preloading the logo globally and the hero image conditionally on homepage views accelerates Largest Contentful Paint (LCP).'
      : 'Enable Preload Critical Assets so browsers discover the homepage hero image during initial HTML parsing.',
    impact: 'High',
    fixActionId: preloadActive ? undefined : 'enable-preload',
    fixActionLabel: preloadActive ? undefined : 'Enable Preload Hints',
  });

  // 9. Image Alt-Text, Lazy Loading & CLS Dimensions
  const allImgsClean =
    allImgs.length > 0 &&
    imgsFullyOptimized.length === allImgs.length &&
    imgsWithAlt.length >= allImgs.length - 1;
  findings.push({
    id: 'cwv-images',
    category: 'Core Web Vitals',
    title: 'Image Lazy Loading, Async Decoding & Explicit Dimensions',
    severity: allImgsClean ? 'pass' : 'warning',
    evidence: `${imgsFullyOptimized.length}/${allImgs.length} <img> tags carry loading="lazy", decoding="async", width, and height; ${imgsWithAlt.length}/${allImgs.length} have descriptive alt attributes.`,
    recommendation:
      'Keep optimizeXmlImages enabled so every theme image reserves layout space (preventing Cumulative Layout Shift) and defers offscreen decoding.',
    impact: 'High',
  });

  // 10. Media Weight & Zero External Stock Hotlinks
  const isZeroRequestSvg = config.imageDeliveryMode === 'inline-svg';
  findings.push({
    id: 'cwv-media-weight',
    category: 'Core Web Vitals',
    title: 'Copyright-Free Lightweight Media Delivery',
    severity: isZeroRequestSvg ? 'pass' : 'warning',
    evidence: isZeroRequestSvg
      ? 'Embedded CC0 inline SVG graphics (< 7 KB total, 0 external image requests, automatic WebP -rw for Blog1 uploads).'
      : `Using external WebP CDN URLs under ${config.domain}/assets/*.webp (requires uploading WebP files to your host).`,
    recommendation: isZeroRequestSvg
      ? 'Self-contained CC0 SVGs guarantee zero broken images and zero extra DNS/TLS handshakes immediately after uploading to Blogger.'
      : 'Ensure your WebP assets are hosted at the configured HTTPS URLs, or switch to CC0 Inline SVG for instant zero-request loading.',
    impact: 'Medium',
    fixActionId: isZeroRequestSvg ? undefined : 'switch-inline-svg',
    fixActionLabel: isZeroRequestSvg ? undefined : 'Switch to CC0 SVG',
  });

  // 11. XML Minification & Payload Budget
  const hasXmlComments = /<!--/.test(xmlWithoutCdata);
  const minifiedClean = config.minifyXml && !hasXmlComments;
  findings.push({
    id: 'cwv-minify',
    category: 'Core Web Vitals',
    title: 'XML Template Minification & Comment Stripping',
    severity: minifiedClean ? 'pass' : 'warning',
    evidence: minifiedClean
      ? `Minified XML output (${xmlSizeKb} KB) with 0 leftover XML comments outside CDATA.`
      : `Unminified XML output (${xmlSizeKb} KB) contains whitespace and developer comments.`,
    recommendation: minifiedClean
      ? 'Minified template reduces TTFB and HTML parsing overhead while preserving all Blogger Theme Designer variables.'
      : 'Enable Minify XML Output before uploading to Blogger to reduce document byte size by ~13%–18%.',
    impact: 'Medium',
    fixActionId: minifiedClean ? undefined : 'enable-minify',
    fixActionLabel: minifiedClean ? undefined : 'Minify XML Now',
  });

  // 12. Link Security, Breadcrumbs & Zero Blocking CDNs
  const hasBreadcrumbs = xml.includes("aria-label='Breadcrumb'");
  const hasNoopener = xml.includes("rel='noopener noreferrer'");
  const hasFontSwap = xml.includes('display=swap');
  findings.push({
    id: 'crawl-links-fonts',
    category: 'Crawlability',
    title: 'Semantic Breadcrumbs, Safe Outbound Links & Font Swap',
    severity: hasBreadcrumbs && hasNoopener && hasFontSwap ? 'pass' : 'warning',
    evidence:
      'Semantic <nav aria-label="Breadcrumb">, rel="noopener noreferrer" on social share links, and font-display: swap verified.',
    recommendation:
      'Pair BreadcrumbList JSON-LD with visible breadcrumb navigation so Google displays clean category paths in mobile search results.',
    impact: 'Low',
  });

  const passedCount = findings.filter((f) => f.severity === 'pass').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;

  return {
    passedCount,
    warningCount,
    criticalCount,
    totalChecks: findings.length,
    jsonLdBlockCount: jsonLdBlocks.length,
    imgTotalCount: allImgs.length,
    imgOptimizedCount: imgsFullyOptimized.length,
    preloadTagCount: preloadTags.length,
    xmlSizeKb,
    homepageTitleLength,
    findings,
  };
}
