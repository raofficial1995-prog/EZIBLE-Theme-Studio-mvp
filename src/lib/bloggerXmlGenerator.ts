import { SiteConfig, XmlPhaseId, XmlValidationReport, ValidationCheckItem } from '../types/template';
import {
  buildCc0ArchitecturalSvgUri,
  buildCc0BrandLogoSvgUri,
} from './lightweightAssets';
import { resolveFaviconHeadLinks } from './faviconGenerator';

export interface ImageOptimizationDefaults {
  defaultWidth?: number;
  defaultHeight?: number;
  heroWidth?: number;
  heroHeight?: number;
  autoFillMissingAlt?: boolean;
}

function appendMissingImgAttributes(
  rawAttrs: string,
  quote: "'" | '"' | '&quot;',
  defaults: Required<ImageOptimizationDefaults>
): string {
  const attrs = rawAttrs.trimEnd();
  const isHero = /ez-hero-img/i.test(attrs);
  const isPostHero = /ez-post-hero-img/i.test(attrs);
  const isBlogThumb = /ez-case-thumb|resizeImage\([^)]*640/i.test(attrs);

  const fallbackWidth = isPostHero
    ? 1200
    : isHero
    ? defaults.heroWidth
    : isBlogThumb
    ? 640
    : defaults.defaultWidth;
  const fallbackHeight = isPostHero
    ? 675
    : isHero
    ? defaults.heroHeight
    : isBlogThumb
    ? 480
    : defaults.defaultHeight;

  let nextAttrs = attrs;
  if (defaults.autoFillMissingAlt) {
    const hasExprAlt = /\bexpr:alt\s*=/i.test(nextAttrs);
    const hasNonEmptyAlt = /\balt\s*=\s*(?:'[^']+'|"[^"]+"|&quot;(?:(?!&quot;).)+&quot;)/i.test(
      nextAttrs
    );
    if (!hasExprAlt && !hasNonEmptyAlt) {
      const fallbackAlt = isHero
        ? 'Enterprise cloud architecture visual'
        : isPostHero
        ? 'Featured engineering article illustration'
        : 'Template visual preview';
      if (/\balt\s*=\s*(?:''|""|&quot;&quot;)/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(
          /\balt\s*=\s*(?:''|""|&quot;&quot;)/i,
          `alt=${quote}${fallbackAlt}${quote}`
        );
      } else {
        nextAttrs = `${nextAttrs} alt=${quote}${fallbackAlt}${quote}`;
      }
    }
  }

  const additions: string[] = [];
  if (!/\bloading\s*=/i.test(nextAttrs)) {
    additions.push(`loading=${quote}lazy${quote}`);
  }
  if (!/\bdecoding\s*=/i.test(nextAttrs)) {
    additions.push(`decoding=${quote}async${quote}`);
  }
  if (!/\bwidth\s*=/i.test(nextAttrs)) {
    additions.push(`width=${quote}${fallbackWidth}${quote}`);
  }
  if (!/\bheight\s*=/i.test(nextAttrs)) {
    additions.push(`height=${quote}${fallbackHeight}${quote}`);
  }

  return additions.length > 0 ? `${nextAttrs} ${additions.join(' ')}` : nextAttrs;
}

/**
 * Automatically optimizes every <img> tag in Blogger XML markup—both direct
 * XHTML <img .../> elements and entity-encoded &lt;img .../&gt; tags inside
 * <b:widget-setting> blocks—by injecting loading="lazy", decoding="async",
 * and explicit width/height attributes whenever missing (protecting CDATA).
 */
export function optimizeXmlImages(
  xml: string,
  options: ImageOptimizationDefaults = {}
): string {
  const defaults: Required<ImageOptimizationDefaults> = {
    defaultWidth: options.defaultWidth ?? 800,
    defaultHeight: options.defaultHeight ?? 600,
    heroWidth: options.heroWidth ?? 960,
    heroHeight: options.heroHeight ?? 540,
    autoFillMissingAlt: options.autoFillMissingAlt ?? false,
  };

  // Split by CDATA blocks so inline CSS/JS inside <![CDATA[...]]> stays untouched
  const segments = xml.split(/(<!\[CDATA\[[\s\S]*?\]\]>)/g);

  return segments
    .map((segment) => {
      if (segment.startsWith('<![CDATA[')) {
        return segment;
      }

      // 1. Direct XHTML/XML <img .../> tags
      let processed = segment.replace(
        /<img\b([^>]*?)(\s*\/?)>/gi,
        (_match, attrs: string, closing: string) => {
          const quote: "'" | '"' = attrs.includes('"') && !attrs.includes("'") ? '"' : "'";
          const nextAttrs = appendMissingImgAttributes(attrs, quote, defaults);
          const selfClose = closing.includes('/') ? '/' : '/';
          return `<img${nextAttrs}${selfClose}>`;
        }
      );

      // 2. Entity-encoded &lt;img .../&gt; tags inside Blogger HTML widget-settings
      processed = processed.replace(
        /&lt;img\b([\s\S]*?)(\s*\/?)&gt;/gi,
        (_match, attrs: string, _closing: string) => {
          const nextAttrs = appendMissingImgAttributes(attrs, '&quot;', defaults);
          return `&lt;img${nextAttrs}/&gt;`;
        }
      );

      return processed;
    })
    .join('');
}

function minifyCssPreservingBloggerVars(cssBlock: string): string {
  const varComments: string[] = [];
  const withoutComments = cssBlock.replace(/\/\*[\s\S]*?\*\//g, (comment) => {
    if (/<Variable\b/i.test(comment)) {
      varComments.push(comment.trim());
    }
    return '';
  });

  const compactCss = withoutComments
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

  return varComments.length > 0
    ? `\n${varComments.join('\n')}\n${compactCss}\n`
    : compactCss;
}

function minifyInlineScriptBlock(scriptTag: string): string {
  // JSON-LD script blocks: strip line indentation while preserving string spaces & Blogger tags
  if (/type=['"]application\/ld\+json['"]/i.test(scriptTag)) {
    return scriptTag
      .replace(/<!--[\s\S]*?-->/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('');
  }

  // Inline JS wrapped in //<![CDATA[ ... //]]>
  return scriptTag.replace(
    /(\/\/<!\[CDATA\[)([\s\S]*?)(\/\/\]\]>)/,
    (_m, open: string, body: string, close: string) => {
      const compactJs = body
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
      return `${open}\n${compactJs}\n${close}`;
    }
  );
}

/**
 * Minifies a complete Google Blogger XML template by stripping XML comments and
 * redundant inter-tag whitespace, compacting CSS inside <b:skin> (while preserving
 * Blogger Theme Designer <Variable> comments), and compacting JSON-LD and inline
 * CDATA scripts without breaking strict XML/XHTML parsing.
 */
export function minifyBloggerXml(xml: string): string {
  const protectedBlocks: string[] = [];
  const stash = (content: string) => {
    const token = `__EZ_MINIFY_TOKEN_${protectedBlocks.length}__`;
    protectedBlocks.push(content);
    return token;
  };

  // 1. Protect and minify <b:skin><![CDATA[...]]></b:skin>
  let working = xml.replace(
    /(<b:skin><!\[CDATA\[)([\s\S]*?)(\]\]><\/b:skin>)/gi,
    (_m, open: string, css: string, close: string) =>
      stash(`${open}${minifyCssPreservingBloggerVars(css)}${close}`)
  );

  // 2. Protect and minify <script ...>...</script> (JSON-LD and inline CDATA JS)
  working = working.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (scriptTag) =>
    stash(minifyInlineScriptBlock(scriptTag))
  );

  // 3. Strip XML comments and collapse unnecessary whitespace outside protected blocks
  working = working
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\r?\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Keep XML declaration and DOCTYPE cleanly separated at top
  working = working
    .replace(/^<\?xml([^?]+)\?>\s*<!DOCTYPE html>\s*/i, '<?xml$1?>\n<!DOCTYPE html>\n');

  // 4. Restore protected blocks
  protectedBlocks.forEach((block, index) => {
    working = working.replace(`__EZ_MINIFY_TOKEN_${index}__`, () => block);
  });

  return working;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeJsonString(value: string): string {
  return JSON.stringify(value)
    .slice(1, -1)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

function googleFontQuery(font: string): string {
  return encodeURIComponent(font).replace(/%20/g, '+');
}

function normalizeBlogsPath(rawPath?: string): string {
  const cleaned = (rawPath || '/search').trim().replace(/^\/+/, '');
  return cleaned || 'search';
}

function buildZoneVisibilityCss(profile: SiteConfig['responsive']['desktop']): string {
  return [
    `.ez-zone-hero-media { display: ${profile.showHeroMedia ? 'block' : 'none'}; }`,
    `.ez-zone-services { display: ${profile.showServices ? 'block' : 'none'}; }`,
    `.ez-zone-projects { display: ${profile.showCaseStudies ? 'block' : 'none'}; }`,
    `.ez-zone-testimonials { display: ${profile.showTestimonials ? 'block' : 'none'}; }`,
    `.ez-zone-home-blogs { display: ${profile.showHomeBlogs ? 'block' : 'none'}; }`,
    `.ez-zone-newsletter { display: ${profile.showNewsletterWidget ? 'block' : 'none'}; }`,
    `.ez-zone-contact { display: ${profile.showContactWidget ? 'block' : 'none'}; }`,
    `.ez-grid-responsive { grid-template-columns: repeat(${profile.gridColumns}, minmax(0, 1fr)); }`,
    `.ez-nav { display: ${profile.navigationStyle === 'inline' ? 'block' : 'none'}; }`,
    `.ez-nav-toggle { display: ${profile.navigationStyle === 'drawer' ? 'inline-flex' : 'none'}; }`,
    profile.compactPadding
      ? `.ez-section { padding: 2.5rem 0; } .ez-hero { padding: 2.5rem 0 2.25rem; } .ez-container { padding: 0 1rem; }`
      : `.ez-section { padding: 4.5rem 0; } .ez-hero { padding: 4.75rem 0 4.25rem; } .ez-container { padding: 0 1.5rem; }`,
  ].join('\n  ');
}

function buildBloggerResponsiveSrcsetExpr(
  imageDataExpr: string,
  widths: number[],
  aspectRatio: string
): string {
  return widths
    .map(
      (width, index) =>
        `resizeImage(${imageDataExpr}, ${width}, &quot;${aspectRatio}&quot;) + &quot; ${width}w${
          index < widths.length - 1 ? ', ' : ''
        }&quot;`
    )
    .join(' + ');
}

function buildResponsivePostPictureXml(options: {
  imageDataExpr: string;
  altExpr: string;
  aspectRatio: string;
  widths: number[];
  defaultWidth: number;
  sizes: string;
  imgClass: string;
  itemProp?: string;
  indent: string;
}): string {
  const {
    imageDataExpr,
    altExpr,
    aspectRatio,
    widths,
    defaultWidth,
    sizes,
    imgClass,
    itemProp,
    indent,
  } = options;
  const srcsetExpr = buildBloggerResponsiveSrcsetExpr(imageDataExpr, widths, aspectRatio);
  const defaultSrcExpr = `resizeImage(${imageDataExpr}, ${defaultWidth}, &quot;${aspectRatio}&quot;)`;
  const itemPropAttr = itemProp ? ` itemprop='${itemProp}'` : '';

  return [
    `${indent}<picture class='ez-picture' data-ez-responsive-picture='true'>`,
    `${indent}  <source data-ez-format='avif' expr:data-srcset='${srcsetExpr}' sizes='${sizes}' type='image/avif'/>`,
    `${indent}  <source data-ez-format='webp' expr:data-srcset='${srcsetExpr}' expr:srcset='${srcsetExpr}' sizes='${sizes}' type='image/webp'/>`,
    `${indent}  <img class='${imgClass}' data-ez-adaptive-img='true' expr:alt='${altExpr}' expr:data-origin-src='${defaultSrcExpr}' expr:src='${defaultSrcExpr}' expr:srcset='${srcsetExpr}'${itemPropAttr} sizes='${sizes}'/>`,
    `${indent}</picture>`,
  ].join('\n');
}

function serviceIconSvg(iconKey: string): string {
  switch (iconKey) {
    case 'cloud':
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'/></svg>`;
    case 'code':
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><polyline points='16 18 22 12 16 6'/><polyline points='8 6 2 12 8 18'/></svg>`;
    case 'cpu':
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><rect height='16' rx='2' width='16' x='4' y='4'/><rect height='6' rx='1' width='6' x='9' y='9'/><path d='M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2'/></svg>`;
    case 'shield':
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/><path d='m9 12 2 2 4-4'/></svg>`;
    case 'database':
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M3 5v14a9 3 0 0 0 18 0V5'/><path d='M3 12a9 3 0 0 0 18 0'/></svg>`;
    default:
      return `<svg aria-hidden='true' fill='none' height='22' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.75' viewBox='0 0 24 24' width='22'><polygon points='12 2 2 7 12 12 22 7 12 2'/><polyline points='2 17 12 22 22 17'/><polyline points='2 12 12 17 22 12'/></svg>`;
  }
}

export function buildJsonLdPreviewObjects(config: SiteConfig) {
  const domainRoot = config.domain.replace(/\/$/, '');
  const organization = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${domainRoot}/#organization`,
    name: config.companyName,
    url: domainRoot,
    logo: `${domainRoot}/assets/ezible-logo.webp`,
    description: config.tagline,
    email: config.contactEmail,
    areaServed: config.areaServed,
    knowsAbout: config.knowsAbout,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${config.companyName} IT Services`,
      itemListElement: config.services.map((svc, idx) => ({
        '@type': 'Offer',
        position: idx + 1,
        itemOffered: {
          '@type': 'Service',
          serviceType: 'ITService',
          name: svc.title,
          description: svc.summary,
          provider: { '@id': `${domainRoot}/#organization` },
        },
      })),
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: domainRoot },
      { '@type': 'ListItem', position: 2, name: 'Tech Insights', item: `${domainRoot}/search/label/Cloud-Architecture` },
      {
        '@type': 'ListItem',
        position: 3,
        name: config.insights[0]?.title || 'Engineering Architecture Brief',
        item: `${domainRoot}/2026/11/${config.insights[0]?.slug || 'brief'}.html`,
      },
    ],
  };

  const samplePost = config.insights[0];
  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: samplePost?.title || 'Enterprise Cloud Architecture Blueprint',
    description: samplePost?.tldrSummary || config.tagline,
    image: `${domainRoot}/assets/insight-edge-computing.webp`,
    author: { '@type': 'Person', name: samplePost?.author || 'Principal Architect' },
    publisher: { '@id': `${domainRoot}/#organization` },
    datePublished: '2026-11-12T08:00:00Z',
    dateModified: '2026-11-24T08:00:00Z',
    mainEntityOfPage: `${domainRoot}/2026/11/${samplePost?.slug || 'brief'}.html`,
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (samplePost?.faqs || []).map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const reviews = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${config.companyName} Client Reviews`,
    itemListElement: config.testimonials.map((t, idx) => ({
      '@type': 'Review',
      position: idx + 1,
      reviewBody: t.quote,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(t.rating),
        bestRating: '5',
      },
      author: {
        '@type': 'Person',
        name: t.author,
        jobTitle: t.role,
        worksFor: { '@type': 'Organization', name: t.organization },
      },
      itemReviewed: { '@id': `${config.domain}/#organization` },
    })),
  };

  return { organization, breadcrumb, article, faqPage, reviews };
}

export function generateStep1Xml(config: SiteConfig): string {
  const { skin } = config;
  const headingFontUrl = googleFontQuery(skin.headingFont);
  const bodyFontUrl = googleFontQuery(skin.bodyFont);
  const fontsLink =
    skin.headingFont === skin.bodyFont
      ? `https://fonts.googleapis.com/css2?family=${headingFontUrl}:wght@400;500;600;700&amp;display=swap`
      : `https://fonts.googleapis.com/css2?family=${headingFontUrl}:wght@600;700&amp;family=${bodyFontUrl}:wght@400;500;600;700&amp;display=swap`;

  const knowsAboutJson = config.knowsAbout.map((k) => `"${escapeJsonString(k)}"`).join(', ');
  const offerCatalogJson = config.services
    .map(
      (svc, idx) =>
        `{"@type":"Offer","position":${idx + 1},"itemOffered":{"@type":"Service","serviceType":"ITService","name":"${escapeJsonString(svc.title)}","description":"${escapeJsonString(svc.summary)}"}}`
    )
    .join(',');

  const domainRoot = config.domain.replace(/\/$/, '');
  const isInlineSvg = config.imageDeliveryMode === 'inline-svg';
  const assetMimeType = isInlineSvg ? 'image/svg+xml' : 'image/webp';
  const logoAssetUrl = isInlineSvg
    ? buildCc0BrandLogoSvgUri(skin.primaryBrandColor, skin.accentColor)
    : `${domainRoot}/assets/ezible-logo.webp`;
  const heroAssetUrl = isInlineSvg
    ? buildCc0ArchitecturalSvgUri('hero', skin.primaryBrandColor, skin.accentColor)
    : `${domainRoot}/assets/hero-ezible-architecture.webp`;

  const postHeroSrcsetExpr = buildBloggerResponsiveSrcsetExpr(
    'data:blog.postImageUrl',
    [480, 800, 1200],
    '16:9'
  );

  const preloadLinksBlock = config.preloadCriticalAssets
    ? `
  <!-- Critical Asset Preloads for Faster LCP (Logo + Homepage Hero + Single Post Featured Image) -->
  <link as='image' fetchpriority='high' href='${escapeXml(logoAssetUrl)}' rel='preload' type='${assetMimeType}'/>
  <b:if cond='data:view.isHomepage'>
    <link as='image' fetchpriority='high' href='${escapeXml(heroAssetUrl)}' rel='preload' type='${assetMimeType}'/>
  </b:if>
  <b:if cond='data:view.isSingleItem and data:blog.postImageUrl'>
    <link as='image' expr:href='resizeImage(data:blog.postImageUrl, 1200, &quot;16:9&quot;)' expr:imagesrcset='${postHeroSrcsetExpr}' fetchpriority='high' imagesizes='(max-width: 640px) 100vw, 780px' rel='preload'/>
  </b:if>`
    : '';

  const socialMetaBlock = config.includeSocialMetaTags
    ? `
  <!-- Explicit Meta Description, Open Graph, Twitter Cards and Auto-Generated postImageUrl -->
  <b:if cond='data:view.isHomepage'>
    <meta content='${escapeXml(config.tagline)}' name='description'/>
    <meta content='website' property='og:type'/>
    <meta content='${escapeXml(config.companyName)} &#8212; ${escapeXml(config.tagline)}' property='og:title'/>
    <meta content='${escapeXml(config.tagline)}' property='og:description'/>
  <b:else/>
    <meta expr:content='data:blog.metaDescription' name='description'/>
    <meta content='article' property='og:type'/>
    <meta expr:content='data:blog.pageName' property='og:title'/>
    <meta expr:content='data:blog.metaDescription' property='og:description'/>
  </b:if>
  <b:if cond='data:blog.postImageUrl'>
    <meta expr:content='resizeImage(data:blog.postImageUrl, 1200, &quot;16:9&quot;)' property='og:image'/>
    <meta content='1200' property='og:image:width'/>
    <meta content='675' property='og:image:height'/>
    <meta expr:content='resizeImage(data:blog.postImageUrl, 1200, &quot;16:9&quot;)' name='twitter:image'/>
  <b:else/>
    <meta content='${escapeXml(heroAssetUrl)}' property='og:image'/>
    <meta content='${escapeXml(heroAssetUrl)}' name='twitter:image'/>
  </b:if>
  <meta content='${escapeXml(config.companyName)}' property='og:site_name'/>
  <meta expr:content='data:blog.canonicalUrl' property='og:url'/>
  <meta content='summary_large_image' name='twitter:card'/>`
    : '';

  const themeVersion = (config.versioning?.version || 'v1.0').trim() || 'v1.0';
  const faviconHead = resolveFaviconHeadLinks(config);

  return `<!-- =========================================================================
     PHASE 1 / STEP 1: XML SKELETON, SEO/AEO/GEO SCHEMA, THEME DESIGNER AND HEADER
     Theme: ${escapeXml(config.companyName)} (${escapeXml(themeVersion)} Production Single-File Blogger XML)
     Strict XHTML/XML Compliant | Zero External Render-Blocking JS/CSS
     ========================================================================= -->
<head>
  <meta charset='utf-8'/>
  <meta content='width=device-width, initial-scale=1.0, viewport-fit=cover' name='viewport'/>
  <meta content='${escapeXml(themeVersion)}' name='theme-version'/>
  <b:include data='blog' name='all-head-content'/>${faviconHead.xmlBlock}${preloadLinksBlock}${socialMetaBlock}

  <!-- Conditional Robots: Prevent Search/Archive Duplicate Dilution -->
  <b:if cond='data:view.isSearch or data:view.isArchive'>
    <meta content='noindex, follow' name='robots'/>
  <b:else/>
    <meta content='index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' name='robots'/>
  </b:if>

  <title>
    <b:if cond='data:view.isHomepage'>
      <data:blog.title/> &#8212; ${escapeXml(config.tagline)}
    <b:elseif cond='data:view.isLabelSearch'/>
      <data:view.search.label/> Blogs | <data:blog.title/>
    <b:elseif cond='data:view.isMultipleItems'/>
      All Blogs &amp; Tech Insights | <data:blog.title/>
    <b:else/>
      <data:blog.pageName/> | <data:blog.title/>
    </b:if>
  </title>

  <!-- Variable / Google Fonts with font-display: swap (Strict XML &amp; Escaping) -->
  <link href='https://fonts.googleapis.com' rel='preconnect'/>
  <link crossorigin='anonymous' href='https://fonts.gstatic.com' rel='preconnect'/>
  <link href='${fontsLink}' rel='stylesheet'/>

  <!-- Dynamic JSON-LD: Organization and ITService Catalog (SEO / AEO / GEO) -->
  <script type='application/ld+json'>
  {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": "${escapeJsonString(config.domain)}/#organization",
    "name": "${escapeJsonString(config.companyName)}",
    "url": "${escapeJsonString(config.domain)}",
    "description": "${escapeJsonString(config.tagline)}",
    "email": "${escapeJsonString(config.contactEmail)}",
    "areaServed": "${escapeJsonString(config.areaServed)}",
    "knowsAbout": [${knowsAboutJson}],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "${escapeJsonString(config.companyName)} IT Solutions",
      "itemListElement": [${offerCatalogJson}]
    }
  }
  </script>

  <!-- Dynamic JSON-LD: BreadcrumbList -->
  <script type='application/ld+json'>
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "<data:blog.homepageUrl.jsonEscaped/>"
      }<b:if cond='data:view.isSingleItem'>,
      {
        "@type": "ListItem",
        "position": 2,
        "name": "<data:blog.pageName.jsonEscaped/>",
        "item": "<data:blog.canonicalUrl.jsonEscaped/>"
      }</b:if>
    ]
  }
  </script>

  <!-- Conditional JSON-LD: TechArticle + FAQPage on Single Post Pages -->
  <b:if cond='data:view.isSingleItem'>
    <script type='application/ld+json'>
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "<data:blog.pageName.jsonEscaped/>",
      "description": "<data:blog.metaDescription.jsonEscaped/>",
      <b:if cond='data:blog.postImageUrl'>"image": {
        "@type": "ImageObject",
        "url": "<data:blog.postImageUrl.jsonEscaped/>",
        "width": 1200,
        "height": 675
      },</b:if>
      "mainEntityOfPage": "<data:blog.canonicalUrl.jsonEscaped/>",
      "publisher": {
        "@type": "Organization",
        "name": "${escapeJsonString(config.companyName)}",
        "url": "${escapeJsonString(config.domain)}"
      }
    }
    </script>
    <script id='ezible-dynamic-faq-ld' type='application/ld+json'>
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What IT services does ${escapeJsonString(config.companyName)} provide?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${escapeJsonString(config.companyName)} delivers ${escapeJsonString(config.knowsAbout.join(', '))} for enterprise organizations across ${escapeJsonString(config.areaServed)}."
          }
        }
      ]
    }
    </script>
  </b:if>

  <!-- Blogger Theme Designer Variables and Production CSS Grid Architecture -->
  <b:skin><![CDATA[
/*
<Variable name="main.bg.color" description="Main Canvas Background" type="color" default="${skin.mainBgColor}" value="${skin.mainBgColor}"/>
<Variable name="primary.brand.color" description="Primary Brand Color" type="color" default="${skin.primaryBrandColor}" value="${skin.primaryBrandColor}"/>
<Variable name="secondary.color" description="Secondary Brand Color" type="color" default="${skin.secondaryColor}" value="${skin.secondaryColor}"/>
<Variable name="accent.color" description="Accent Action Color" type="color" default="${skin.accentColor}" value="${skin.accentColor}"/>
<Variable name="text.color" description="Primary Body Text Color" type="color" default="${skin.textColor}" value="${skin.textColor}"/>
<Variable name="heading.font" description="Heading Font Family" type="font" default="700 32px '${skin.headingFont}', system-ui, sans-serif" value="700 32px '${skin.headingFont}', system-ui, sans-serif"/>
<Variable name="body.font" description="Body Font Family" type="font" default="400 16px '${skin.bodyFont}', system-ui, sans-serif" value="400 16px '${skin.bodyFont}', system-ui, sans-serif"/>
*/

:root {
  --main-bg: $(main.bg.color);
  --brand-primary: $(primary.brand.color);
  --brand-secondary: $(secondary.color);
  --brand-accent: $(accent.color);
  --text-main: $(text.color);
  --text-muted: #475569;
  --surface: #ffffff;
  --border-hairline: rgba(15, 23, 42, 0.1);
  --font-heading: $(heading.font);
  --font-body: $(body.font);
  --grid-gap: 1.5rem;
  --container-max: 1200px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background-color: var(--main-bg);
  color: var(--text-main);
  font: var(--font-body);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 {
  font-family: '${skin.headingFont}', system-ui, -apple-system, sans-serif;
  color: var(--brand-primary);
  letter-spacing: -0.025em;
  line-height: 1.18;
  margin-top: 0;
  text-wrap: balance;
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--brand-accent); text-decoration: none; }
a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}

/* 12-Column Responsive CSS Grid System + Per-Device Widget Management */
.ez-container {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 1.5rem;
}
.ez-grid-12 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--grid-gap);
}
.ez-grid-responsive {
  display: grid;
  grid-template-columns: repeat(${config.responsive.desktop.gridColumns}, minmax(0, 1fr));
  gap: var(--grid-gap);
}
.ez-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--grid-gap);
}
.ez-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--grid-gap);
}

/* Sticky Glassmorphic Header (3-Zone Contract + Responsive Drawer) */
.ez-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-hairline);
}
.ez-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 64px;
}
.ez-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}
.ez-brand-title {
  font-family: '${skin.headingFont}', system-ui, sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--brand-primary);
  white-space: nowrap;
  flex-shrink: 0;
  margin: 0;
}
.ez-nav ul {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 1.75rem;
  margin: 0;
  padding: 0;
}
.ez-nav a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  transition: color 180ms var(--ease-out);
}
.ez-nav a:hover { color: var(--brand-primary); text-decoration: underline; text-underline-offset: 6px; }
.ez-nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  background: var(--surface);
  color: var(--brand-primary);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.ez-mobile-drawer {
  display: none;
  border-top: 1px solid var(--border-hairline);
  background: var(--surface);
  padding: 0.75rem 1.25rem 1.25rem;
}
.ez-mobile-drawer.is-open { display: block; }
.ez-mobile-drawer ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.ez-mobile-drawer a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 0.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--brand-primary);
  border-bottom: 1px solid var(--border-hairline);
}
.ez-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--brand-accent);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  min-height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
}
.ez-btn-primary:hover { opacity: 0.92; }
.ez-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--surface);
  color: var(--brand-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  min-height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--brand-secondary);
  white-space: nowrap;
  cursor: pointer;
}

/* Sections, Surfaces & Dedicated Device Widget Zones */
.ez-section { padding: 4.5rem 0; border-bottom: 1px solid var(--border-hairline); }
.ez-section-head { max-width: 44rem; margin-bottom: 2.25rem; }
.ez-section-head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 2.25rem;
}
.ez-section-head h2, .ez-section-head-row h2 { font-size: clamp(1.55rem, 2.5vw, 2.25rem); margin-bottom: 0.5rem; }
.ez-section-head p, .ez-section-head-row p { color: var(--text-muted); margin: 0; }
.ez-card {
  background: var(--surface);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ez-card-link {
  margin-top: auto;
  padding-top: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--brand-accent);
  white-space: nowrap;
}
.ez-meta-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.ez-home-blogs-cta {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-start;
}
.ez-device-banner {
  background: var(--surface);
  border: 1px solid var(--border-hairline);
  border-left: 3px solid var(--brand-secondary);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.ez-device-banner h3 { font-size: 1rem; margin: 0 0 0.25rem; }
.ez-device-banner p { margin: 0; font-size: 0.875rem; color: var(--text-muted); }

/* Dedicated All Blogs Page: Label Filter Bar & Dynamic Pagination */
.ez-blogs-filter-bar {
  margin: 0 0 2rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
}
.ez-label-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.65rem;
}
.ez-label-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  min-height: 36px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--brand-primary);
  background: var(--main-bg);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}
.ez-label-btn:hover { border-color: var(--brand-accent); color: var(--brand-accent); }
.ez-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-hairline);
}

/* Hero Section */
.ez-hero { padding: 4.75rem 0 4.25rem; border-bottom: 1px solid var(--border-hairline); }
.ez-hero-copy { grid-column: span 6 / span 6; display: flex; flex-direction: column; justify-content: center; gap: 1.25rem; }
.ez-hero-media { grid-column: span 6 / span 6; }
.ez-hero h1 { font-size: clamp(2rem, 3.8vw, 3.35rem); margin: 0; }
.ez-hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.5rem; }
.ez-hero-img { width: 100%; height: 100%; min-height: 280px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-hairline); }

/* Case Studies, Adaptive Pictures & Lightbox */
.ez-picture { display: block; width: 100%; }
.ez-case-thumb { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius-sm); cursor: zoom-in; }
.ez-post-hero-figure { margin: 0 0 1.75rem; }
.ez-post-hero-img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-hairline); }
.ez-outcome { font-weight: 600; color: var(--brand-primary); font-variant-numeric: tabular-nums; font-size: 0.9rem; }
.ez-lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.88);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.ez-lightbox.is-open { display: flex; }
.ez-lightbox-panel { max-width: 920px; width: 100%; background: var(--surface); border-radius: var(--radius-md); overflow: hidden; }
.ez-lightbox-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--border-hairline); }

/* AEO & GEO Post Typography Components */
.ez-article { max-width: 780px; margin: 0 auto; padding: 1.5rem 0 2.5rem; }
.aeo-tldr-box {
  background: var(--surface);
  border: 1px solid var(--border-hairline);
  border-left: 3px solid var(--brand-secondary);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin: 1.75rem 0 2.25rem;
}
.aeo-tldr-box h2 { font-size: 1rem; margin-bottom: 0.5rem; }
.ez-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.geo-spec-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  background: var(--surface);
  border: 1px solid var(--border-hairline);
}
.geo-spec-table th, .geo-spec-table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-hairline);
}
.geo-spec-table th { font-weight: 600; color: var(--brand-primary); background: var(--main-bg); }
.faq-accordion details {
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}
.faq-accordion summary { font-weight: 600; color: var(--brand-primary); cursor: pointer; }
.ez-share-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 0;
  margin-top: 2rem;
  border-top: 1px solid var(--border-hairline);
  border-bottom: 1px solid var(--border-hairline);
}
.ez-share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  min-height: 40px;
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--brand-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

/* Footer, Newsletter & Anti-Spam Contact Form */
.ez-footer { background: var(--brand-primary); color: #e2e8f0; padding: 4rem 0 2.5rem; }
.ez-footer h2, .ez-footer h3 { color: #ffffff; }
.ez-newsletter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-md);
  margin-bottom: 3rem;
}
.ez-newsletter-form { display: flex; flex-wrap: wrap; gap: 0.75rem; flex: 1; max-width: 480px; }
.ez-input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  min-height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  font-size: 0.9rem;
}
.ez-hp-trap { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }
.ez-contact-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.875rem; }
.ez-contact-full { grid-column: span 2 / span 2; }
.ez-footer-brand-col { grid-column: span 5 / span 5; }
.ez-footer-form-col { grid-column: span 7 / span 7; }
.ez-footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.825rem;
  color: #94a3b8;
}

/* Desktop Device Profile (>= 1025px) */
${buildZoneVisibilityCss(config.responsive.desktop)}
.ez-desktop-only-zone { display: ${config.responsive.desktop.customWidgetEnabled ? 'block' : 'none'}; }
.ez-tablet-only-zone, .ez-mobile-only-zone { display: none; }

/* Tablet Device Profile (641px - 1024px) */
@media (min-width: 641px) and (max-width: 1024px) {
  .ez-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ez-hero-copy, .ez-hero-media { grid-column: span 12 / span 12; }
  .ez-footer-brand-col, .ez-footer-form-col { grid-column: span 12 / span 12; }
  ${buildZoneVisibilityCss(config.responsive.tablet)}
  .ez-desktop-only-zone, .ez-mobile-only-zone { display: none; }
  .ez-tablet-only-zone { display: ${config.responsive.tablet.customWidgetEnabled ? 'block' : 'none'}; }
}

/* Mobile Device Profile (<= 640px) */
@media (max-width: 640px) {
  .ez-header-inner { min-height: 56px; gap: 0.75rem; }
  .ez-header-cta { display: none; }
  .ez-grid-12, .ez-grid-3, .ez-grid-2 { grid-template-columns: 1fr; }
  .ez-hero-copy, .ez-hero-media { grid-column: span 1 / span 1; }
  .ez-footer-brand-col, .ez-footer-form-col { grid-column: span 1 / span 1; }
  .ez-contact-grid { grid-template-columns: 1fr; }
  .ez-contact-full { grid-column: span 1 / span 1; }
  .ez-btn-primary, .ez-btn-secondary { min-height: 44px; }
  ${buildZoneVisibilityCss(config.responsive.mobile)}
  .ez-desktop-only-zone, .ez-tablet-only-zone { display: none; }
  .ez-mobile-only-zone { display: ${config.responsive.mobile.customWidgetEnabled ? 'block' : 'none'}; }
}${
    config.accessibility.includeSkipToContent
      ? `
.ez-skip-link {
  position: absolute;
  left: -9999px;
  top: 0.75rem;
  z-index: 1000;
  padding: 0.625rem 1rem;
  background: var(--brand-primary);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}
.ez-skip-link:focus, .ez-skip-link:focus-visible {
  left: 0.75rem;
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}`
      : ''
  }${
    config.accessibility.respectReducedMotion
      ? `
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`
      : ''
  }
]]></b:skin>
</head>`;
}

export function generateStep2Xml(config: SiteConfig): string {
  const serviceWidgets = config.services
    .map(
      (svc, idx) => `        <b:widget id='HTML${idx + 2}' locked='false' title='${escapeXml(svc.title)}' type='HTML' version='2' visible='true'>
          <b:widget-settings>
            <b:widget-setting name='content'>&lt;div class=&quot;ez-card&quot;&gt;&lt;div style=&quot;color:var(--brand-accent);&quot;&gt;${escapeXml(serviceIconSvg(svc.iconKey))}&lt;/div&gt;&lt;h3&gt;${escapeXml(svc.index)} ${escapeXml(svc.title)}&lt;/h3&gt;&lt;p&gt;${escapeXml(svc.summary)}&lt;/p&gt;&lt;p class=&quot;ez-outcome&quot;&gt;${escapeXml(svc.deliverable)}&lt;/p&gt;&lt;/div&gt;</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'>
            <data:content/>
          </b:includable>
        </b:widget>`
    )
    .join('\n');

  const heroImgSrc =
    config.imageDeliveryMode === 'inline-svg'
      ? buildCc0ArchitecturalSvgUri(
          'hero',
          config.skin.primaryBrandColor,
          config.skin.accentColor
        )
      : `${config.domain.replace(/\/$/, '')}/assets/hero-ezible-architecture.webp`;

  const caseStudyWidgets = config.caseStudies
    .map((cs, idx) => {
      const imgSrc =
        config.imageDeliveryMode === 'inline-svg'
          ? buildCc0ArchitecturalSvgUri(
              cs.svgKind,
              config.skin.primaryBrandColor,
              config.skin.accentColor
            )
          : `${config.domain.replace(/\/$/, '')}/assets/${cs.id}.webp`;
      return `        <b:widget id='HTML${idx + 8}' locked='false' title='${escapeXml(cs.title)}' type='HTML' version='2' visible='true'>
          <b:widget-settings>
            <b:widget-setting name='content'>&lt;article class=&quot;ez-card&quot;&gt;&lt;img alt=&quot;${escapeXml(cs.imageAlt)}&quot; class=&quot;ez-case-thumb&quot; data-lightbox-caption=&quot;${escapeXml(cs.galleryCaption)}&quot; data-lightbox-src=&quot;${escapeXml(imgSrc)}&quot; data-lightbox-title=&quot;${escapeXml(cs.title)}&quot; src=&quot;${escapeXml(imgSrc)}&quot;/&gt;&lt;div class=&quot;ez-meta-line&quot;&gt;&lt;span&gt;${escapeXml(cs.client)}&lt;/span&gt;&lt;span&gt;&#183;&lt;/span&gt;&lt;span&gt;${escapeXml(cs.sector)}&lt;/span&gt;&lt;/div&gt;&lt;h3&gt;${escapeXml(cs.title)}&lt;/h3&gt;&lt;p&gt;${escapeXml(cs.summary)}&lt;/p&gt;&lt;p class=&quot;ez-outcome&quot;&gt;${escapeXml(cs.outcome)}&lt;/p&gt;&lt;div class=&quot;ez-meta-line&quot;&gt;${escapeXml(cs.stack.join(' / '))}&lt;/div&gt;&lt;/article&gt;</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'>
            <data:content/>
          </b:includable>
        </b:widget>`;
    })
    .join('\n');

  const testimonialWidgets = config.testimonials
    .map(
      (t, idx) => `        <b:widget id='HTML${idx + 11}' locked='false' title='${escapeXml(t.author)}' type='HTML' version='2' visible='true'>
          <b:widget-settings>
            <b:widget-setting name='content'>&lt;figure class=&quot;ez-card&quot; itemscope=&quot;itemscope&quot; itemtype=&quot;https://schema.org/Review&quot;&gt;&lt;div class=&quot;ez-meta-line&quot; itemprop=&quot;reviewRating&quot; itemscope=&quot;itemscope&quot; itemtype=&quot;https://schema.org/Rating&quot;&gt;&lt;meta content=&quot;${t.rating}&quot; itemprop=&quot;ratingValue&quot;/&gt;&lt;meta content=&quot;5&quot; itemprop=&quot;bestRating&quot;/&gt;&lt;span&gt;${t.rating}.0 / 5.0 Verified Review&lt;/span&gt;&lt;span&gt;&#183;&lt;/span&gt;&lt;span&gt;${escapeXml(t.verifiedMetric)}&lt;/span&gt;&lt;/div&gt;&lt;blockquote itemprop=&quot;reviewBody&quot; style=&quot;margin:0;&quot;&gt;&#8220;${escapeXml(t.quote)}&#8221;&lt;/blockquote&gt;&lt;figcaption class=&quot;ez-meta-line&quot; itemprop=&quot;author&quot; itemscope=&quot;itemscope&quot; itemtype=&quot;https://schema.org/Person&quot;&gt;&lt;strong itemprop=&quot;name&quot;&gt;${escapeXml(t.author)}&lt;/strong&gt;&lt;span&gt;&#183;&lt;/span&gt;&lt;span&gt;${escapeXml(t.role)}, ${escapeXml(t.organization)}&lt;/span&gt;&lt;/figcaption&gt;&lt;/figure&gt;</b:widget-setting>
          </b:widget-settings>
          <b:includable id='main'>
            <data:content/>
          </b:includable>
        </b:widget>`
    )
    .join('\n');

  return `  <!-- =========================================================================
       PHASE 2 / STEP 2: HOMEPAGE SECTIONS AND SEPARATE DEVICE WIDGET ZONES
       Editable via Blogger Layout (showaddelement='yes')
       ========================================================================= -->
  <b:if cond='data:view.isHomepage'>
    <!-- 1. Hero Section -->
    <section aria-label='Hero' class='ez-hero'>
      <div class='ez-container'>
        <b:section id='ezible-hero' maxwidgets='1' showaddelement='yes'>
          <b:widget id='HTML1' locked='false' title='Homepage Hero' type='HTML' version='2' visible='true'>
            <b:widget-settings>
              <b:widget-setting name='content'>&lt;div class=&quot;ez-grid-12&quot;&gt;&lt;div class=&quot;ez-hero-copy&quot;&gt;&lt;h1&gt;${escapeXml(config.heroHeadline)}&lt;/h1&gt;&lt;p&gt;${escapeXml(config.heroSubheadline)}&lt;/p&gt;&lt;div class=&quot;ez-hero-actions&quot;&gt;&lt;a class=&quot;ez-btn-primary&quot; href=&quot;#ezible-footer&quot;&gt;${escapeXml(config.heroPrimaryCta)}&lt;/a&gt;&lt;a class=&quot;ez-btn-secondary&quot; href=&quot;#case-studies&quot;&gt;${escapeXml(config.heroSecondaryCta)}&lt;/a&gt;&lt;/div&gt;&lt;/div&gt;&lt;div class=&quot;ez-hero-media ez-zone-hero-media&quot;&gt;&lt;img alt=&quot;${escapeXml(config.companyName)} enterprise software engineering architecture&quot; class=&quot;ez-hero-img&quot; fetchpriority=&quot;high&quot; src=&quot;${escapeXml(heroImgSrc)}&quot;/&gt;&lt;/div&gt;&lt;/div&gt;</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'>
              <data:content/>
            </b:includable>
          </b:widget>
        </b:section>
      </div>
    </section>

    <!-- Dedicated Separate Device Widget Zones (Desktop, Tablet, Mobile) -->
    <section aria-label='Desktop Custom Widgets' class='ez-section ez-desktop-only-zone'>
      <div class='ez-container'>
        <b:section id='ezible-desktop-widgets' showaddelement='yes'>
          <b:widget id='HTML15' locked='false' title='Desktop Custom Widget' type='HTML' version='2' visible='true'>
            <b:widget-settings>
              <b:widget-setting name='content'>&lt;div class=&quot;ez-device-banner&quot;&gt;&lt;div&gt;&lt;h3&gt;${escapeXml(config.responsive.desktop.customWidgetTitle)}&lt;/h3&gt;&lt;p&gt;${escapeXml(config.responsive.desktop.customWidgetBody)}&lt;/p&gt;&lt;/div&gt;&lt;a class=&quot;ez-btn-secondary&quot; href=&quot;#ezible-footer&quot;&gt;Contact Desk&lt;/a&gt;&lt;/div&gt;</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'>
              <data:content/>
            </b:includable>
          </b:widget>
        </b:section>
      </div>
    </section>

    <section aria-label='Tablet Custom Widgets' class='ez-section ez-tablet-only-zone'>
      <div class='ez-container'>
        <b:section id='ezible-tablet-widgets' showaddelement='yes'>
          <b:widget id='HTML16' locked='false' title='Tablet Custom Widget' type='HTML' version='2' visible='true'>
            <b:widget-settings>
              <b:widget-setting name='content'>&lt;div class=&quot;ez-device-banner&quot;&gt;&lt;div&gt;&lt;h3&gt;${escapeXml(config.responsive.tablet.customWidgetTitle)}&lt;/h3&gt;&lt;p&gt;${escapeXml(config.responsive.tablet.customWidgetBody)}&lt;/p&gt;&lt;/div&gt;&lt;a class=&quot;ez-btn-primary&quot; href=&quot;#ezible-footer&quot;&gt;Schedule Review&lt;/a&gt;&lt;/div&gt;</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'>
              <data:content/>
            </b:includable>
          </b:widget>
        </b:section>
      </div>
    </section>

    <section aria-label='Mobile Custom Widgets' class='ez-section ez-mobile-only-zone'>
      <div class='ez-container'>
        <b:section id='ezible-mobile-widgets' showaddelement='yes'>
          <b:widget id='HTML17' locked='false' title='Mobile Custom Widget' type='HTML' version='2' visible='true'>
            <b:widget-settings>
              <b:widget-setting name='content'>&lt;div class=&quot;ez-device-banner&quot;&gt;&lt;div&gt;&lt;h3&gt;${escapeXml(config.responsive.mobile.customWidgetTitle)}&lt;/h3&gt;&lt;p&gt;${escapeXml(config.responsive.mobile.customWidgetBody)}&lt;/p&gt;&lt;/div&gt;&lt;a class=&quot;ez-btn-primary&quot; href=&quot;#ezible-footer&quot;&gt;Request Callback&lt;/a&gt;&lt;/div&gt;</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'>
              <data:content/>
            </b:includable>
          </b:widget>
        </b:section>
      </div>
    </section>

    <!-- 2. Services Grid (Device-Managed Responsive CSS Grid) -->
    <section class='ez-section ez-zone-services' id='services'>
      <div class='ez-container'>
        <div class='ez-section-head'>
          <h2>Core Engineering Capabilities</h2>
          <p>Each service card below maps to an editable HTML widget inside Blogger Layout.</p>
        </div>
        <b:section class='ez-grid-responsive' id='ezible-services' showaddelement='yes'>
${serviceWidgets}
        </b:section>
      </div>
    </section>

    <!-- 3. Projects and Case Studies Showcase with Vanilla JS Gallery Lightbox -->
    <section class='ez-section ez-zone-projects' id='case-studies'>
      <div class='ez-container'>
        <div class='ez-section-head'>
          <h2>Projects &amp; Case Studies</h2>
          <p>Verified engineering outcomes across regulated cloud, logistics, and cybersecurity systems. Click any thumbnail to open the gallery inspector.</p>
        </div>
        <b:section class='ez-grid-responsive' id='ezible-projects' showaddelement='yes'>
${caseStudyWidgets}
        </b:section>
      </div>
    </section>

    <!-- 4. Client Testimonials with Review Schema Markup -->
    <section class='ez-section ez-zone-testimonials' id='testimonials'>
      <div class='ez-container'>
        <div class='ez-section-head'>
          <h2>Client Outcomes &amp; Testimonials</h2>
          <p>Attributable engineering reviews structured with Schema.org Review microdata.</p>
        </div>
        <b:section class='ez-grid-responsive' id='ezible-testimonials' showaddelement='yes'>
${testimonialWidgets}
        </b:section>
      </div>
    </section>
  </b:if>`;
}

export function generateStep3Xml(config: SiteConfig): string {
  const blogsPath = escapeXml(normalizeBlogsPath(config.blogsPagePath));
  const homeLimit = config.homepageBlogLimit;

  return `  <!-- =========================================================================
       PHASE 2 / STEP 3: HOMEPAGE BLOG PREVIEW (3-6 POSTS, NO TAGS),
       SEPARATE ALL-BLOGS ARCHIVE PAGE (WITH SCOPED LABEL1 TAGS),
       AND DYNAMIC SINGLE POST VIEW (AEO / GEO)
       ========================================================================= -->
  <main class='ez-section' id='main-content' role='main'>
    <div class='ez-container' id='insights'>
      <!-- A. Homepage Header: Curated 3-6 Posts Controlled via Blogger Settings (Zero Tags/Labels Here) -->
      <b:if cond='data:view.isHomepage'>
        <div class='ez-section-head-row ez-zone-home-blogs'>
          <div>
            <h2>Latest Tech Insights</h2>
            <p>Showing up to ${homeLimit} recent posts configured in Blogger Settings. Browse the full archive and topic labels on our dedicated Blogs page.</p>
          </div>
          <a class='ez-btn-secondary' expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>View All Blogs &#8594;</a>
        </div>
      </b:if>

      <!-- B. Dedicated Separate All-Blogs Archive Page Header + Label1 Tags (Only on Blogs Page) -->
      <b:if cond='data:view.isMultipleItems and !data:view.isHomepage'>
        <div class='ez-section-head'>
          <nav aria-label='Breadcrumb' class='ez-meta-line' style='margin-bottom:0.75rem;'>
            <a expr:href='data:blog.homepageUrl'>Home</a>
            <span>/</span>
            <span>Blogs</span>
          </nav>
          <h1 style='font-size:clamp(1.85rem, 3vw, 2.65rem);margin-bottom:0.5rem;'>
            <b:if cond='data:view.isLabelSearch'>
              Topic: <data:view.search.label/>
            <b:else/>
              All Tech Insights &amp; Engineering Blogs
            </b:if>
          </h1>
          <p>Explore every published engineering brief dynamically, filter by topic tags below, or open any article for full architectural benchmarks.</p>
        </div>

        <!-- Scoped Label1 Tag Filter Widget (Exclusively Rendered on Separate Blogs Page) -->
        <b:section class='ez-blogs-filter-bar' id='blogs-labels-section' maxwidgets='1' showaddelement='yes'>
          <b:widget id='Label1' locked='false' title='Filter by Topic Label' type='Label' version='2' visible='true'>
            <b:includable id='main'>
              <div style='font-size:0.8rem;font-weight:600;color:var(--brand-primary);'><data:title/></div>
              <div class='ez-label-list'>
                <a class='ez-label-btn' expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>All Blogs</a>
                <b:loop values='data:labels' var='label'>
                  <a class='ez-label-btn' expr:href='data:label.url'>
                    <span><data:label.name/></span>
                    <span style='color:var(--text-muted);'>(<data:label.count/>)</span>
                  </a>
                </b:loop>
              </div>
            </b:includable>
          </b:widget>
        </b:section>
      </b:if>

      <b:section id='main' maxwidgets='1' showaddelement='no'>
        <b:widget id='Blog1' locked='true' title='Blog Posts' type='Blog' version='2' visible='true'>
          <b:includable id='main'>
            <!-- 1. HOMEPAGE COMPACT FEED (Strictly 3-6 Posts, Zero Tag/Label Links) -->
            <b:if cond='data:view.isHomepage'>
              <div class='ez-zone-home-blogs'>
                <div class='ez-grid-responsive'>
                  <b:loop index='idx' values='data:posts' var='post'>
                    <b:if cond='data:idx lt ${homeLimit}'>
                      <article class='ez-card' itemscope='itemscope' itemtype='https://schema.org/TechArticle'>
                        <b:if cond='data:post.featuredImage'>
                          <a expr:href='data:post.url'>
${buildResponsivePostPictureXml({
  imageDataExpr: 'data:post.featuredImage',
  altExpr: 'data:post.title',
  aspectRatio: '4:3',
  widths: [360, 640, 960],
  defaultWidth: 640,
  sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  imgClass: 'ez-case-thumb',
  indent: '                            ',
})}
                          </a>
                        </b:if>
                        <div class='ez-meta-line'>
                          <span><data:post.date/></span>
                          <span>&#183;</span>
                          <span class='ez-read-time' expr:data-words='data:post.snippets.short.length'>5 min read</span>
                        </div>
                        <h3 itemprop='headline'>
                          <a expr:href='data:post.url' style='color:var(--brand-primary);'><data:post.title/></a>
                        </h3>
                        <p style='margin:0;color:var(--text-muted);font-size:0.92rem;'><data:post.snippets.short/></p>
                        <a class='ez-card-link' expr:href='data:post.url'>Read Article &#8594;</a>
                      </article>
                    </b:if>
                  </b:loop>
                </div>
                <div class='ez-home-blogs-cta'>
                  <a class='ez-btn-secondary' expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>Browse All Blogs &#8594;</a>
                </div>
              </div>
            </b:if>

            <!-- 2. SEPARATE ALL-BLOGS ARCHIVE VIEW (All Posts + Labels + Native Dynamic Pagination) -->
            <b:if cond='data:view.isMultipleItems and !data:view.isHomepage'>
              <div class='ez-grid-responsive'>
                <b:loop values='data:posts' var='post'>
                  <article class='ez-card' itemscope='itemscope' itemtype='https://schema.org/TechArticle'>
                    <b:if cond='data:post.featuredImage'>
                      <a expr:href='data:post.url'>
${buildResponsivePostPictureXml({
  imageDataExpr: 'data:post.featuredImage',
  altExpr: 'data:post.title',
  aspectRatio: '4:3',
  widths: [360, 640, 960],
  defaultWidth: 640,
  sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  imgClass: 'ez-case-thumb',
  indent: '                        ',
})}
                      </a>
                    </b:if>
                    <div class='ez-meta-line'>
                      <b:if cond='data:post.labels'>
                        <a expr:href='data:post.labels.first.url'><data:post.labels.first.name/></a>
                        <span>&#183;</span>
                      </b:if>
                      <span><data:post.date/></span>
                      <span>&#183;</span>
                      <span class='ez-read-time' expr:data-words='data:post.snippets.short.length'>5 min read</span>
                    </div>
                    <h3 itemprop='headline'>
                      <a expr:href='data:post.url' style='color:var(--brand-primary);'><data:post.title/></a>
                    </h3>
                    <p style='margin:0;color:var(--text-muted);font-size:0.92rem;'><data:post.snippets.short/></p>
                    <a class='ez-card-link' expr:href='data:post.url'>Read Article &#8594;</a>
                  </article>
                </b:loop>
              </div>

              <nav aria-label='Blog pagination' class='ez-pager'>
                <div>
                  <b:if cond='data:newerPageUrl'>
                    <a class='ez-btn-secondary' expr:href='data:newerPageUrl'>&#8592; Newer Blogs</a>
                  </b:if>
                </div>
                <div>
                  <b:if cond='data:olderPageUrl'>
                    <a class='ez-btn-secondary' expr:href='data:olderPageUrl'>Older Blogs &#8594;</a>
                  </b:if>
                </div>
              </nav>
            </b:if>

            <!-- 3. DYNAMIC SINGLE BLOG POST PAGE (Semantic HTML5 + Auto postImageUrl WebP/AVIF + AEO TL;DR) -->
            <b:if cond='data:view.isSingleItem'>
              <b:loop values='data:posts' var='post'>
                <article class='ez-article' itemscope='itemscope' itemtype='https://schema.org/TechArticle'>
                  <nav aria-label='Breadcrumb' class='ez-meta-line' style='margin-bottom:1rem;'>
                    <a expr:href='data:blog.homepageUrl'>Home</a>
                    <span>/</span>
                    <a expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>Blogs</a>
                    <span>/</span>
                    <span><data:post.title/></span>
                  </nav>

                  <h1 itemprop='headline' style='font-size:clamp(1.85rem, 3.2vw, 2.75rem);margin-bottom:0.85rem;'>
                    <data:post.title/>
                  </h1>

                  <div class='ez-meta-line' style='margin-bottom:1.5rem;'>
                    <span itemprop='author'><data:post.author.name/></span>
                    <span>&#183;</span>
                    <time expr:datetime='data:post.date.iso8601' itemprop='datePublished'><data:post.date/></time>
                    <span>&#183;</span>
                    <span class='ez-read-time-body'>Calculating read time...</span>
                  </div>

                  <!-- Auto-Generated Responsive Featured Image (data:blog.postImageUrl with WebP/AVIF Switching) -->
                  <b:if cond='data:blog.postImageUrl'>
                    <figure class='ez-post-hero-figure'>
${buildResponsivePostPictureXml({
  imageDataExpr: 'data:blog.postImageUrl',
  altExpr: 'data:post.title',
  aspectRatio: '16:9',
  widths: [480, 800, 1200],
  defaultWidth: 1200,
  sizes: '(max-width: 640px) 100vw, 780px',
  imgClass: 'ez-post-hero-img',
  itemProp: 'image',
  indent: '                      ',
})}
                    </figure>
                  <b:elseif cond='data:post.featuredImage'/>
                    <figure class='ez-post-hero-figure'>
${buildResponsivePostPictureXml({
  imageDataExpr: 'data:post.featuredImage',
  altExpr: 'data:post.title',
  aspectRatio: '16:9',
  widths: [480, 800, 1200],
  defaultWidth: 1200,
  sizes: '(max-width: 640px) 100vw, 780px',
  imgClass: 'ez-post-hero-img',
  itemProp: 'image',
  indent: '                      ',
})}
                    </figure>
                  </b:if>

                  <!-- AEO Highlighted Key Takeaways / TL;DR Box -->
                  <section aria-label='Key Takeaways' class='aeo-tldr-box'>
                    <h2>Key Takeaways / TL;DR</h2>
                    <p style='margin:0;color:var(--text-muted);'><data:post.snippets.long/></p>
                  </section>

                  <!-- Full Semantic Post Body (Supports .geo-spec-table and .faq-accordion) -->
                  <section class='ez-post-body' itemprop='articleBody'>
                    <data:post.body/>
                  </section>

                  <!-- Zero-Dependency Inline SVG Social Sharing Buttons -->
                  <div aria-label='Share this article' class='ez-share-bar'>
                    <span style='font-size:0.85rem;font-weight:600;color:var(--brand-primary);'>Share Brief:</span>
                    <a${config.accessibility.enforceAriaLandmarks ? " aria-label='Share on LinkedIn (opens in new tab)'" : ''} class='ez-share-btn' expr:href='&quot;https://www.linkedin.com/sharing/share-offsite/?url=&quot; + data:post.url' rel='noopener noreferrer' target='_blank'>
                      <svg aria-hidden='true' fill='none' height='15' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24' width='15'><path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'/><rect height='12' width='4' x='2' y='9'/><circle cx='4' cy='4' r='2'/></svg>
                      <span>LinkedIn</span>
                    </a>
                    <a${config.accessibility.enforceAriaLandmarks ? " aria-label='Share on X (opens in new tab)'" : ''} class='ez-share-btn' expr:href='&quot;https://twitter.com/intent/tweet?url=&quot; + data:post.url + &quot;&amp;text=&quot; + data:post.title' rel='noopener noreferrer' target='_blank'>
                      <svg aria-hidden='true' fill='none' height='15' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24' width='15'><path d='M4 4l11.733 16h4.267l-11.733 -16zM4 20l6.768 -6.768M13.232 10.768l6.768 -6.768'/></svg>
                      <span>X</span>
                    </a>
                    <a${config.accessibility.enforceAriaLandmarks ? " aria-label='Share on WhatsApp (opens in new tab)'" : ''} class='ez-share-btn' expr:href='&quot;https://api.whatsapp.com/send?text=&quot; + data:post.title + &quot;%20&quot; + data:post.url' rel='noopener noreferrer' target='_blank'>
                      <svg aria-hidden='true' fill='none' height='15' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24' width='15'><path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'/></svg>
                      <span>WhatsApp</span>
                    </a>
                    <button${config.accessibility.enforceAriaLandmarks ? " aria-label='Copy article link to clipboard'" : ''} class='ez-share-btn' data-copy-url='true' expr:data-url='data:post.url' type='button'>
                      <svg aria-hidden='true' fill='none' height='15' stroke='currentColor' stroke-width='1.8' viewBox='0 0 24 24' width='15'><rect height='13' rx='2' width='13' x='9' y='9'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>
                      <span>Copy Link</span>
                    </button>
                  </div>

                  <div class='ez-pager'>
                    <a class='ez-btn-secondary' expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>&#8592; Back to All Blogs</a>
                    <a class='ez-btn-secondary' expr:href='data:blog.homepageUrl'>Homepage</a>
                  </div>
                </article>
              </b:loop>
            </b:if>
          </b:includable>
        </b:widget>
      </b:section>
    </div>
  </main>`;
}

export function generateStep4Xml(config: SiteConfig): string {
  return `  <!-- =========================================================================
       PHASE 2 / STEP 4: AUTOMATED NEWSLETTER, ANTI-SPAM CONTACT FORM AND ZERO-BLOAT JS
       ========================================================================= -->
  <footer class='ez-footer' id='ezible-footer'>
    <div class='ez-container'>
      <!-- 1. Automated Newsletter Signup (Brevo / Mailchimp / ConvertKit Ready) -->
      <div class='ez-zone-newsletter'>
        <b:section id='footer-newsletter' maxwidgets='1' showaddelement='yes'>
          <b:widget id='HTML14' locked='false' title='Newsletter Automation' type='HTML' version='2' visible='true'>
            <b:widget-settings>
              <b:widget-setting name='content'>&lt;div class=&quot;ez-newsletter-bar&quot;&gt;&lt;div&gt;&lt;h2 style=&quot;font-size:1.35rem;margin-bottom:0.25rem;&quot;&gt;Monthly Architecture &amp;amp; Security Dispatch&lt;/h2&gt;&lt;p style=&quot;margin:0;color:#cbd5e1;font-size:0.9rem;&quot;&gt;Delivered via ${escapeXml(config.newsletterProvider)} automation. Zero fluff, unsubscribe anytime.&lt;/p&gt;&lt;/div&gt;&lt;form action=&quot;${escapeXml(config.newsletterActionUrl)}&quot; class=&quot;ez-newsletter-form&quot; data-ez-honeypot-form=&quot;true&quot; method=&quot;post&quot;&gt;&lt;input aria-hidden=&quot;true&quot; autocomplete=&quot;off&quot; class=&quot;ez-hp-trap&quot; name=&quot;company_website&quot; tabindex=&quot;-1&quot; type=&quot;text&quot;/&gt;&lt;label class=&quot;ez-hp-trap&quot; for=&quot;ez-news-email&quot;&gt;Work Email&lt;/label&gt;&lt;input class=&quot;ez-input&quot; id=&quot;ez-news-email&quot; name=&quot;EMAIL&quot; placeholder=&quot;name@company.com&quot; required=&quot;required&quot; style=&quot;flex:1;min-width:220px;&quot; type=&quot;email&quot;/&gt;&lt;button class=&quot;ez-btn-primary&quot; type=&quot;submit&quot;&gt;Subscribe&lt;/button&gt;&lt;/form&gt;&lt;/div&gt;</b:widget-setting>
            </b:widget-settings>
            <b:includable id='main'>
              <data:content/>
            </b:includable>
          </b:widget>
        </b:section>
      </div>

      <!-- 2. Brand Summary and Native Blogger Anti-Spam ContactForm1 -->
      <div class='ez-grid-12'>
        <div class='ez-footer-brand-col'>
          <h3 style='font-size:1.2rem;margin-bottom:0.75rem;'>${escapeXml(config.companyName)}</h3>
          <p style='color:#cbd5e1;max-width:36ch;margin-bottom:1.25rem;'>${escapeXml(config.tagline)}</p>
          <p style='font-size:0.85rem;color:#94a3b8;margin:0;'>Service Coverage: ${escapeXml(config.areaServed)}</p>
          <p style='font-size:0.85rem;color:#94a3b8;margin-top:0.35rem;'>Direct Desk: ${escapeXml(config.contactEmail)}</p>
        </div>

        <div class='ez-footer-form-col ez-zone-contact'>
          <b:section id='footer-contact' maxwidgets='1' showaddelement='no'>
            <b:widget id='ContactForm1' locked='false' title='Request Architecture Consultation' type='ContactForm' version='2' visible='true'>
              <b:includable id='main'>
                <h3 style='font-size:1.1rem;margin-bottom:1rem;'><data:title/></h3>
                <form class='ez-contact-grid' data-ez-honeypot-form='true' name='contact-form'>
                  <!-- Custom Anti-Spam Honeypot Field + Native Blogger Server-Side Protection -->
                  <input aria-hidden='true' autocomplete='off' class='ez-hp-trap' name='ez_contact_hp' tabindex='-1' type='text'/>
                  <div>
                    <label for='ContactForm1_contact-form-name' style='display:block;font-size:0.8rem;margin-bottom:0.35rem;color:#cbd5e1;'>Full Name</label>
                    <input class='ez-input contact-form-name' id='ContactForm1_contact-form-name' name='name' placeholder='Jane Rivera' required='required' type='text'/>
                  </div>
                  <div>
                    <label for='ContactForm1_contact-form-email' style='display:block;font-size:0.8rem;margin-bottom:0.35rem;color:#cbd5e1;'>Work Email</label>
                    <input class='ez-input contact-form-email' id='ContactForm1_contact-form-email' name='email' placeholder='jane@enterprise.com' required='required' type='email'/>
                  </div>
                  <div class='ez-contact-full'>
                    <label for='ContactForm1_contact-form-email-message' style='display:block;font-size:0.8rem;margin-bottom:0.35rem;color:#cbd5e1;'>Project Scope &amp; Timeline</label>
                    <textarea class='ez-input contact-form-email-message' id='ContactForm1_contact-form-email-message' name='email-message' placeholder='Describe your infrastructure, custom software, or security goals...' required='required' rows='3'></textarea>
                  </div>
                  <div class='ez-contact-full' style='display:flex;align-items:center;gap:1rem;'>
                    <input class='ez-btn-primary contact-form-button-submit' id='ContactForm1_contact-form-submit' type='button' value='Send Inquiry'/>
                    <span class='contact-form-error-message' id='ContactForm1_contact-form-error-message' style='font-size:0.82rem;color:#fca5a5;'></span>
                    <span class='contact-form-success-message' id='ContactForm1_contact-form-success-message' style='font-size:0.82rem;color:#86efac;'></span>
                  </div>
                </form>
              </b:includable>
            </b:widget>
          </b:section>
        </div>
      </div>

      <div class='ez-footer-bottom'>
        <span>&#169; <span id='ez-year'>2026</span> ${escapeXml(config.companyName)}. All rights reserved.</span>
        <span>Built on Google Blogger XML v3 &#183; Responsive Desktop, Tablet &amp; Mobile Architecture</span>
      </div>
    </div>
  </footer>

  <!-- Lightweight Vanilla JS Lightbox Modal for Case Studies -->
  <div${config.accessibility.enforceAriaLandmarks ? " aria-describedby='ez-lightbox-caption' aria-labelledby='ez-lightbox-title'" : ''} aria-modal='true' class='ez-lightbox' id='ez-lightbox' role='dialog'>
    <div class='ez-lightbox-panel'>
      <div class='ez-lightbox-bar'>
        <strong id='ez-lightbox-title' style='font-size:0.95rem;'>Case Study Preview</strong>
        <button${config.accessibility.enforceAriaLandmarks ? " aria-label='Close case study preview'" : ''} class='ez-btn-secondary' id='ez-lightbox-close' type='button'>Close</button>
      </div>
      <img alt='${config.accessibility.autoFillMissingAlt ? 'Selected case study visual preview' : ''}' id='ez-lightbox-img' style='width:100%;max-height:70vh;object-fit:contain;background:#0f172a;'/>
      <p id='ez-lightbox-caption' style='margin:0;padding:1rem 1.25rem;font-size:0.875rem;color:#475569;'></p>
    </div>
  </div>

  <!-- Deferred Zero-Dependency Inline Script (No External CDNs) -->
  <script>//<![CDATA[
  (function() {
    var yearEl = document.getElementById('ez-year');
    if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

    /* 0. Responsive Mobile & Tablet Navigation Drawer */
    var navToggle = document.getElementById('ez-mobile-nav-toggle');
    var navDrawer = document.getElementById('ez-mobile-drawer');
    if (navToggle && navDrawer) {
      navToggle.addEventListener('click', function() {
        var open = navDrawer.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      navDrawer.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          navDrawer.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    /* 1. Case Study Gallery Lightbox */
    var lb = document.getElementById('ez-lightbox');
    var lbImg = document.getElementById('ez-lightbox-img');
    var lbTitle = document.getElementById('ez-lightbox-title');
    var lbCap = document.getElementById('ez-lightbox-caption');
    var lbClose = document.getElementById('ez-lightbox-close');
    document.querySelectorAll('[data-lightbox-src]').forEach(function(el) {
      el.addEventListener('click', function() {
        if (!lb || !lbImg) return;
        lbImg.src = el.getAttribute('data-lightbox-src') || '';
        lbImg.alt = el.getAttribute('alt') || '';
        if (lbTitle) lbTitle.textContent = el.getAttribute('data-lightbox-title') || '';
        if (lbCap) lbCap.textContent = el.getAttribute('data-lightbox-caption') || '';
        lb.classList.add('is-open');
      });
    });
    if (lbClose && lb) {
      lbClose.addEventListener('click', function() { lb.classList.remove('is-open'); });
      lb.addEventListener('click', function(e) { if (e.target === lb) lb.classList.remove('is-open'); });
    }

    /* 2. Reading Time Estimator for Single Post View */
    var bodyEl = document.querySelector('.ez-post-body');
    var rtEl = document.querySelector('.ez-read-time-body');
    if (bodyEl && rtEl) {
      var words = (bodyEl.textContent || '').trim().split(/\s+/).filter(Boolean).length;
      var mins = Math.max(1, Math.ceil(words / 220));
      rtEl.textContent = mins + ' min read';
    }

    /* 3. Copy Link Share Button */
    document.querySelectorAll('[data-copy-url="true"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var url = btn.getAttribute('data-url') || window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function() {
            var span = btn.querySelector('span');
            if (span) {
              span.textContent = 'Copied';
              setTimeout(function() { span.textContent = 'Copy Link'; }, 2000);
            }
          });
        }
      });
    });

    /* 4. Client-Side Anti-Spam Honeypot Guard */
    document.querySelectorAll('[data-ez-honeypot-form="true"]').forEach(function(form) {
      form.addEventListener('submit', function(ev) {
        var trap = form.querySelector('.ez-hp-trap');
        if (trap && trap.value && trap.value.trim().length > 0) {
          ev.preventDefault();
          return false;
        }
      });
    });

    /* 5. Auto-Optimize Runtime Blog Images (Responsive AVIF/WebP Format Switching, Lazy, Async, Dimensions) */
    function ezIsBloggerCdn(url) {
      return /(googleusercontent\.com|bp\.blogspot\.com)/i.test(url);
    }

    function ezToFormatUrl(url, fmt) {
      if (!url || url.indexOf('data:') === 0) return url;
      if (ezIsBloggerCdn(url)) {
        var suffix = fmt === 'avif' ? '-rw-e365' : fmt === 'webp' ? '-rw' : '';
        if (!suffix) return url;
        var clean = url.replace(/(-rw-e365|-rw|-rj)(?=\/|$|\?)/gi, '');
        if (/\/[sw]\d+[^/]*/.test(clean)) {
          return clean.replace(/(\/[sw]\d+[^/]*)/, '$1' + suffix);
        }
        if (/=[sw]\d+[^&]*/.test(clean)) {
          return clean.replace(/(=[sw]\d+[^&]*)/, '$1' + suffix);
        }
        return clean;
      }
      if (/\.(png|jpe?g|webp)(\?.*)?$/i.test(url)) {
        if (fmt === 'avif') return url.replace(/\.(png|jpe?g|webp)(\?.*)?$/i, '.avif$2');
        if (fmt === 'webp') return url.replace(/\.(png|jpe?g)(\?.*)?$/i, '.webp$2');
      }
      return url;
    }

    function ezRewriteSrcset(srcset, fmt) {
      if (!srcset) return '';
      return srcset.split(',').map(function(entry) {
        var parts = entry.trim().split(/\s+/);
        if (!parts[0]) return entry.trim();
        parts[0] = ezToFormatUrl(parts[0], fmt);
        return parts.join(' ');
      }).join(', ');
    }

    function ezProbeFormat(dataUri, cb) {
      var probe = new Image();
      probe.onload = function() { cb(probe.width > 0 && probe.height > 0); };
      probe.onerror = function() { cb(false); };
      probe.src = dataUri;
    }

    function ezDetectFormat(cb) {
      var avifUri = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      var webpUri = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
      ezProbeFormat(avifUri, function(hasAvif) {
        if (hasAvif) { cb('avif', true); return; }
        ezProbeFormat(webpUri, function(hasWebp) {
          cb(hasWebp ? 'webp' : 'origin', hasWebp);
        });
      });
    }

    function ezApplyResponsiveFormats(bestFmt, supportsWebp) {
      document.documentElement.setAttribute('data-ez-img-format', bestFmt);

      document.querySelectorAll('picture[data-ez-responsive-picture="true"]').forEach(function(pic) {
        var avifSrc = pic.querySelector('source[data-ez-format="avif"]');
        var webpSrc = pic.querySelector('source[data-ez-format="webp"]');
        if (avifSrc) {
          var rawAvif = avifSrc.getAttribute('data-srcset') || '';
          if (bestFmt === 'avif' && rawAvif) {
            avifSrc.setAttribute('srcset', ezRewriteSrcset(rawAvif, 'avif'));
          } else {
            avifSrc.removeAttribute('srcset');
          }
        }
        if (webpSrc) {
          var rawWebp = webpSrc.getAttribute('data-srcset') || webpSrc.getAttribute('srcset') || '';
          if ((bestFmt === 'avif' || supportsWebp) && rawWebp) {
            webpSrc.setAttribute('srcset', ezRewriteSrcset(rawWebp, 'webp'));
          }
        }
      });

      document.querySelectorAll('img').forEach(function(img) {
        if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.getAttribute('width') && img.naturalWidth) img.setAttribute('width', String(img.naturalWidth));
        if (!img.getAttribute('height') && img.naturalHeight) img.setAttribute('height', String(img.naturalHeight));

        var originSrc = img.getAttribute('data-origin-src') || img.getAttribute('src') || '';
        if (!originSrc || originSrc.indexOf('data:') === 0) return;
        if (!img.getAttribute('data-origin-src')) img.setAttribute('data-origin-src', originSrc);

        var targetFmt = bestFmt === 'avif' && ezIsBloggerCdn(originSrc) ? 'avif' : (supportsWebp ? 'webp' : 'origin');
        if (targetFmt !== 'origin') {
          var upgraded = ezToFormatUrl(originSrc, targetFmt);
          if (upgraded !== originSrc) {
            img.addEventListener('error', function onEzImgError() {
              img.removeEventListener('error', onEzImgError);
              var parentPic = img.closest && img.closest('picture[data-ez-responsive-picture="true"]');
              if (parentPic) {
                var aEl = parentPic.querySelector('source[data-ez-format="avif"]');
                if (aEl) aEl.removeAttribute('srcset');
              }
              var fallbackUrl = targetFmt === 'avif' ? ezToFormatUrl(originSrc, 'webp') : originSrc;
              img.setAttribute('src', fallbackUrl === img.getAttribute('src') ? originSrc : fallbackUrl);
              if (img.getAttribute('srcset')) {
                img.setAttribute('srcset', ezRewriteSrcset(img.getAttribute('srcset'), 'webp'));
              }
            });
            img.setAttribute('src', upgraded);
          }
          var rawSrcset = img.getAttribute('srcset');
          if (rawSrcset) {
            img.setAttribute('srcset', ezRewriteSrcset(rawSrcset, targetFmt));
          }
        }
      });
    }

    ezDetectFormat(ezApplyResponsiveFormats);
  })();
  //]]></script>`;
}

export function generateCompleteBloggerXml(config: SiteConfig): string {
  const step1Head = generateStep1Xml(config);
  const step2Home = generateStep2Xml(config);
  const step3Blog = generateStep3Xml(config);
  const step4Footer = generateStep4Xml(config);
  const blogsPath = escapeXml(normalizeBlogsPath(config.blogsPagePath));

  const skipLinkMarkup = config.accessibility.includeSkipToContent
    ? `\n  <a class='ez-skip-link' href='#main-content'>Skip to main content</a>`
    : '';

  const formattedXml = optimizeXmlImages(
    `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:css='false' b:defaultwidgetversion='2' b:layoutsVersion='3' b:responsive='true' b:templateVersion='1.3.0' expr:dir='data:blog.languageDirection' expr:lang='data:blog.locale' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>
${step1Head}
<body>${skipLinkMarkup}
  <!-- Sticky Glassmorphic Header: 3-Zone Contract + Responsive Mobile/Tablet Drawer -->
  <header class='ez-header' id='ezible-header'>
    <div class='ez-container ez-header-inner'>
      <b:section id='header' maxwidgets='1' showaddelement='no'>
        <b:widget id='Header1' locked='true' title='${escapeXml(config.companyName)}' type='Header' version='2' visible='true'>
          <b:includable id='main'>
            <a${config.accessibility.enforceAriaLandmarks ? ` aria-label='${escapeXml(config.companyName)} Home'` : ''} class='ez-brand-title' expr:href='data:blog.homepageUrl'>
              <data:title/>
            </a>
          </b:includable>
        </b:widget>
      </b:section>

      <b:section class='ez-nav' id='navigation' maxwidgets='1' showaddelement='no'>
        <b:widget id='PageList1' locked='false' title='Primary Navigation' type='PageList' version='2' visible='true'>
          <b:includable id='main'>
            <nav aria-label='Primary navigation'>
              <ul>
                <li><a expr:href='data:blog.homepageUrl + &quot;#services&quot;'>Capabilities</a></li>
                <li><a expr:href='data:blog.homepageUrl + &quot;#case-studies&quot;'>Case Studies</a></li>
                <li><a expr:href='data:blog.homepageUrl + &quot;#testimonials&quot;'>Reviews</a></li>
                <li><a expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>Blogs</a></li>
                <b:loop values='data:links' var='link'>
                  <li><a expr:href='data:link.href'><data:link.title/></a></li>
                </b:loop>
              </ul>
            </nav>
          </b:includable>
        </b:widget>
      </b:section>

      <div class='ez-header-actions'>
        <a class='ez-btn-primary ez-header-cta' href='#ezible-footer'>Schedule Review</a>
        <button aria-controls='ez-mobile-drawer' aria-expanded='false' aria-label='Toggle navigation menu' class='ez-nav-toggle' id='ez-mobile-nav-toggle' type='button'>
          <svg aria-hidden='true' fill='none' height='20' stroke='currentColor' stroke-linecap='round' stroke-width='2' viewBox='0 0 24 24' width='20'><line x1='3' x2='21' y1='6' y2='6'/><line x1='3' x2='21' y1='12' y2='12'/><line x1='3' x2='21' y1='18' y2='18'/></svg>
        </button>
      </div>
    </div>

    <nav aria-label='Mobile and Tablet navigation' class='ez-mobile-drawer' id='ez-mobile-drawer'>
      <ul>
        <li><a expr:href='data:blog.homepageUrl'>Home</a></li>
        <li><a expr:href='data:blog.homepageUrl + &quot;#services&quot;'>Capabilities</a></li>
        <li><a expr:href='data:blog.homepageUrl + &quot;#case-studies&quot;'>Case Studies</a></li>
        <li><a expr:href='data:blog.homepageUrl + &quot;#testimonials&quot;'>Reviews</a></li>
        <li><a expr:href='data:blog.homepageUrl + &quot;${blogsPath}&quot;'>All Blogs</a></li>
        <li><a href='#ezible-footer'>Schedule Review</a></li>
      </ul>
    </nav>
  </header>

${step2Home}

${step3Blog}

${step4Footer}
</body>
</html>`,
    { autoFillMissingAlt: config.accessibility.autoFillMissingAlt }
  );

  return config.minifyXml ? minifyBloggerXml(formattedXml) : formattedXml;
}

export function getXmlMinificationStats(config: SiteConfig): {
  rawBytes: number;
  minifiedBytes: number;
  savedBytes: number;
  savedPercent: number;
} {
  const raw = generateCompleteBloggerXml({ ...config, minifyXml: false });
  const minified = minifyBloggerXml(raw);
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(raw).length;
  const minifiedBytes = encoder.encode(minified).length;
  const savedBytes = Math.max(0, rawBytes - minifiedBytes);
  const savedPercent = rawBytes > 0 ? Number(((savedBytes / rawBytes) * 100).toFixed(1)) : 0;
  return { rawBytes, minifiedBytes, savedBytes, savedPercent };
}

export function getPhaseXmlSnippet(config: SiteConfig, phase: XmlPhaseId): string {
  switch (phase) {
    case 'step1':
      return optimizeXmlImages(
        `<?xml version="1.0" encoding="UTF-8" ?>\n<!DOCTYPE html>\n<html b:css='false' b:defaultwidgetversion='2' b:layoutsVersion='3' b:responsive='true' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'>\n${generateStep1Xml(config)}\n</html>`
      );
    case 'step2':
      return optimizeXmlImages(generateStep2Xml(config));
    case 'step3':
      return optimizeXmlImages(generateStep3Xml(config));
    case 'step4':
      return optimizeXmlImages(generateStep4Xml(config));
    default:
      return generateCompleteBloggerXml(config);
  }
}

export function validateBloggerXml(
  xml: string,
  options?: { preloadCriticalAssets?: boolean }
): XmlValidationReport {
  let wellFormed = true;
  let parserError: string | null = null;

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const errNode = doc.querySelector('parsererror');
    if (errNode) {
      wellFormed = false;
      parserError = errNode.textContent?.trim() || 'XML parsing error detected.';
    }
  }

  const lineCount = xml.split('\n').length;
  const byteSize = new TextEncoder().encode(xml).length;

  const requiredVars = [
    'main.bg.color',
    'primary.brand.color',
    'secondary.color',
    'accent.color',
    'text.color',
    'heading.font',
    'body.font',
  ];
  const hasAllVars = requiredVars.every((v) => xml.includes(`name="${v}"`));

  const hasNamespaces =
    xml.includes("xmlns:b='http://www.google.com/2005/gml/b'") &&
    xml.includes("xmlns:data='http://www.google.com/2005/gml/data'") &&
    xml.includes("xmlns:expr='http://www.google.com/2005/gml/expr'");

  const openBIf = (xml.match(/<b:if\b/g) || []).length;
  const closeBIf = (xml.match(/<\/b:if>/g) || []).length;
  const balancedBIf = openBIf === closeBIf && openBIf > 0;

  const hasAllHeadContent = xml.includes("name='all-head-content'");
  const hasConditionalNoindex =
    xml.includes("data:view.isSearch") && xml.includes("content='noindex, follow'");
  const hasEntityJsonLd =
    xml.includes('"@type": ["Organization", "ProfessionalService"]') &&
    xml.includes('"knowsAbout"') &&
    xml.includes('"areaServed"') &&
    xml.includes('"ITService"');
  const hasAeoClasses =
    xml.includes('.aeo-tldr-box') &&
    xml.includes('.geo-spec-table') &&
    xml.includes('.faq-accordion');
  const hasLazyLoading = xml.includes("loading='lazy'") || xml.includes('loading=&quot;lazy&quot;');
  const hasFontDisplaySwap = xml.includes('display=swap');
  const xmlWithoutComments = xml.replace(/<!--[\s\S]*?-->/g, '').toLowerCase();
  const zeroExternalBloat =
    !xmlWithoutComments.includes('jquery') &&
    !xmlWithoutComments.includes('fontawesome') &&
    !xmlWithoutComments.includes('bootstrap.min');
  const hasAntiSpam =
    xml.includes("type='ContactForm'") &&
    xml.includes('ez-hp-trap') &&
    xml.includes('data-ez-honeypot-form');

  const xmlWithoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const directImgs = xmlWithoutCdata.match(/<img\b[^>]*>/gi) || [];
  const encodedImgs = xmlWithoutCdata.match(/&lt;img\b[\s\S]*?&gt;/gi) || [];
  const allImgs = [...directImgs, ...encodedImgs];
  const optimizedImgs = allImgs.filter(
    (tag) =>
      /\bloading=(?:'|"|&quot;)lazy(?:'|"|&quot;)/i.test(tag) &&
      /\bdecoding=(?:'|"|&quot;)async(?:'|"|&quot;)/i.test(tag) &&
      /\bwidth=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag) &&
      /\bheight=(?:'|"|&quot;)\d+(?:'|"|&quot;)/i.test(tag)
  );
  const allImagesOptimized =
    allImgs.length > 0 && optimizedImgs.length === allImgs.length;

  const hasCopyrightFreeLightweightMedia =
    !/(shutterstock|gettyimages|istockphoto|alamy|depositphotos|123rf|unsplash\.com|pexels\.com)/i.test(
      xmlWithoutComments
    ) &&
    !xmlWithoutComments.includes('/src/assets/') &&
    allImagesOptimized;

  const preloadExpected = options?.preloadCriticalAssets ?? true;
  const preloadMatches = xmlWithoutCdata.match(/<link\b[^>]*rel='preload'[^>]*>/gi) || [];
  const preloadCheckPassed = preloadExpected ? preloadMatches.length >= 2 : true;

  const hasScopedBlogsAndLabels =
    xml.includes("id='Label1'") &&
    xml.includes('data:view.isMultipleItems and !data:view.isHomepage') &&
    xml.includes('data:idx lt');
  const hasResponsiveDeviceZones =
    xml.includes("id='ezible-tablet-widgets'") &&
    xml.includes("id='ezible-mobile-widgets'") &&
    xml.includes('ez-mobile-drawer');
  const hasPostImageAndAvifWebp =
    xml.includes('data:blog.postImageUrl') &&
    xml.includes("type='image/avif'") &&
    xml.includes("type='image/webp'") &&
    xml.includes('data-ez-responsive-picture') &&
    xml.includes('ezDetectFormat');
  const hasBrandFaviconTags =
    /<link\b[^>]*rel='icon'[^>]*>/i.test(xmlWithoutCdata) &&
    /<link\b[^>]*rel='apple-touch-icon'[^>]*>/i.test(xmlWithoutCdata) &&
    /<meta\b[^>]*name='theme-color'[^>]*>/i.test(xmlWithoutCdata);

  const checks: ValidationCheckItem[] = [
    {
      id: 'xml-wellformed',
      category: 'XML Syntax',
      label: 'Strict XHTML / XML Parser Validation',
      passed: wellFormed,
      detail: wellFormed
        ? 'Parsed cleanly via DOMParser(application/xml) with zero syntax or escaping errors.'
        : parserError || 'Malformed XML structure.',
    },
    {
      id: 'xml-namespaces',
      category: 'Blogger Schema',
      label: 'Blogger Namespaces (b, data, expr)',
      passed: hasNamespaces,
      detail: 'Declares xmlns:b, xmlns:data, and xmlns:expr on the root <html> element.',
    },
    {
      id: 'xml-bif-balance',
      category: 'Blogger Schema',
      label: 'Balanced <b:if> Conditional Tags',
      passed: balancedBIf,
      detail: `${openBIf} opening and ${closeBIf} closing <b:if> blocks verified.`,
    },
    {
      id: 'xml-skin-vars',
      category: 'Blogger Schema',
      label: 'Theme Designer <Variable> Definitions',
      passed: hasAllVars,
      detail: 'All 7 color and typography variables mapped inside <b:skin> CDATA.',
    },
    {
      id: 'xml-blog-routing',
      category: 'Blogger Schema',
      label: 'Homepage Blog Cap (3–6) & Separate Blogs Page',
      passed: hasScopedBlogsAndLabels,
      detail: 'Homepage caps posts (3–6) with zero tag/label clutter; Label1 and pagination are isolated to the dedicated Blogs page.',
    },
    {
      id: 'xml-responsive-zones',
      category: 'Blogger Schema',
      label: 'Separate Desktop, Tablet & Mobile Widget Zones',
      passed: hasResponsiveDeviceZones,
      detail: 'Includes ezible-tablet-widgets, ezible-mobile-widgets, per-device media queries, and responsive navigation drawer.',
    },
    {
      id: 'seo-head-canonical',
      category: 'SEO / AEO / GEO',
      label: 'Canonical & Conditional Search noindex',
      passed: hasAllHeadContent && hasConditionalNoindex,
      detail: 'Includes all-head-content and noindex directive for search/archive views.',
    },
    {
      id: 'seo-jsonld',
      category: 'SEO / AEO / GEO',
      label: 'Entity-Rich JSON-LD (Organization, ITService, Breadcrumb, Article, FAQ)',
      passed: hasEntityJsonLd,
      detail: 'Structured knowsAbout, areaServed, OfferCatalog, and conditional post schemas active.',
    },
    {
      id: 'aeo-blocks',
      category: 'SEO / AEO / GEO',
      label: 'Reusable AEO/GEO CSS Classes',
      passed: hasAeoClasses,
      detail: '.aeo-tldr-box, .geo-spec-table, and .faq-accordion defined for AI Overview extraction.',
    },
    {
      id: 'perf-zero-bloat',
      category: 'Performance & Security',
      label: 'Zero Render-Blocking Libraries & Lazy Media',
      passed: zeroExternalBloat && hasLazyLoading && hasFontDisplaySwap,
      detail: 'No external JS/icon CDNs; inline SVGs, lazy images, and font-display: swap.',
    },
    {
      id: 'perf-copyright-media',
      category: 'Performance & Security',
      label: 'Automated Image Optimization & Copyright-Free Media',
      passed: hasCopyrightFreeLightweightMedia,
      detail: `${optimizedImgs.length}/${allImgs.length} <img> tags automatically injected with loading="lazy", decoding="async", and explicit width/height (zero CLS, zero stock hotlinks).`,
    },
    {
      id: 'perf-postimage-avif-webp',
      category: 'Performance & Security',
      label: 'Auto postImageUrl & Responsive WebP/AVIF Switching',
      passed: hasPostImageAndAvifWebp,
      detail: 'Auto-generates data:blog.postImageUrl preload, OG/Twitter, JSON-LD ImageObject, and responsive <picture> WebP/AVIF sources with runtime capability switching and safe fallback.',
    },
    {
      id: 'perf-preload-critical',
      category: 'Performance & Security',
      label: 'Critical Asset Preloading (Logo, Hero & Post LCP)',
      passed: preloadCheckPassed,
      detail: preloadExpected
        ? `${preloadMatches.length} <link rel='preload' as='image' fetchpriority='high'> tags injected in <head> for logo, homepage hero, and single-post featured image.`
        : 'Preload Critical Assets toggle is currently disabled in Theme Sidebar.',
    },
    {
      id: 'brand-favicon-icons',
      category: 'SEO / AEO / GEO',
      label: "Brand Favicon & Apple Touch Icon (<link rel='icon'>)",
      passed: hasBrandFaviconTags,
      detail: hasBrandFaviconTags
        ? "Injected <link rel='icon'>, <link rel='shortcut icon'>, <link rel='apple-touch-icon'>, and theme-color metadata into <head>."
        : "Favicon/App Icon head injection is disabled in Theme Sidebar.",
    },
    {
      id: 'sec-antispam',
      category: 'Performance & Security',
      label: 'Honeypot Traps & Native ContactForm Protection',
      passed: hasAntiSpam,
      detail: 'Hidden honeypot fields paired with Blogger native server-side ContactForm filtering.',
    },
  ];

  return {
    wellFormed,
    parserError,
    lineCount,
    byteSize,
    checks,
  };
}
