export type HeadingFontOption =
  | 'Plus Jakarta Sans'
  | 'Outfit'
  | 'Manrope'
  | 'Bricolage Grotesque';

export type BodyFontOption =
  | 'Public Sans'
  | 'DM Sans'
  | 'Plus Jakarta Sans'
  | 'Manrope';

export type NewsletterProvider =
  | 'Brevo'
  | 'Mailchimp'
  | 'ConvertKit'
  | 'Custom Webhook';

export type ImageDeliveryMode = 'inline-svg' | 'webp-cdn';

export type WorkspaceTab = 'preview' | 'xml' | 'schema' | 'audit' | 'a11y' | 'perf' | 'deploy';

export type XmlPhaseId = 'merged' | 'step1' | 'step2' | 'step3' | 'step4';

export type DeviceProfileKey = 'desktop' | 'tablet' | 'mobile';

export type HomepageBlogLimit = 3 | 4 | 5 | 6;

export interface DeviceWidgetProfile {
  gridColumns: 1 | 2 | 3;
  showHeroMedia: boolean;
  showServices: boolean;
  showCaseStudies: boolean;
  showTestimonials: boolean;
  showHomeBlogs: boolean;
  showNewsletterWidget: boolean;
  showContactWidget: boolean;
  compactPadding: boolean;
  navigationStyle: 'inline' | 'drawer';
  customWidgetEnabled: boolean;
  customWidgetTitle: string;
  customWidgetBody: string;
}

export interface ResponsiveLayoutConfig {
  desktop: DeviceWidgetProfile;
  tablet: DeviceWidgetProfile;
  mobile: DeviceWidgetProfile;
}

export interface ThemeSkinVariables {
  mainBgColor: string;
  primaryBrandColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  headingFont: HeadingFontOption;
  bodyFont: BodyFontOption;
}

export interface ServiceItem {
  id: string;
  index: string;
  title: string;
  summary: string;
  deliverable: string;
  iconKey: 'cloud' | 'code' | 'shield' | 'cpu' | 'database' | 'layers';
}

export interface CaseStudyItem {
  id: string;
  title: string;
  client: string;
  sector: string;
  outcome: string;
  summary: string;
  stack: string[];
  svgKind: 'cloud' | 'ai' | 'security';
  imageUrl: string;
  imageAlt: string;
  galleryCaption: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  rating: number;
  verifiedMetric: string;
}

export interface SpecTableRow {
  criterion: string;
  legacyApproach: string;
  ezibleArchitecture: string;
  measuredDelta: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InsightPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  publishedDate: string;
  author: string;
  readMinutes: number;
  excerpt: string;
  svgKind: 'cloud' | 'ai' | 'security';
  imageUrl: string;
  imageAlt: string;
  tldrSummary: string;
  tldrBullets: string[];
  sections: {
    heading: string;
    body: string;
    subHeading?: string;
    subBody?: string;
  }[];
  specTable: SpecTableRow[];
  faqs: FaqItem[];
}

export interface ThemeVersioning {
  version: string;
  notes: string;
}

export interface AccessibilityConfig {
  autoFillMissingAlt: boolean;
  enforceAriaLandmarks: boolean;
  includeSkipToContent: boolean;
  respectReducedMotion: boolean;
}

export type FaviconStyleOption =
  | 'studio-artwork'
  | 'prism-monogram'
  | 'hex-node'
  | 'minimal-badge';

export interface FaviconConfig {
  enabled: boolean;
  style: FaviconStyleOption;
  monogram: string;
  customIconUrl: string;
  embeddedPngDataUri: string;
}

export interface SiteConfig {
  versioning: ThemeVersioning;
  homepageBlogLimit: HomepageBlogLimit;
  blogsPagePath: string;
  responsive: ResponsiveLayoutConfig;
  accessibility: AccessibilityConfig;
  favicon: FaviconConfig;
  companyName: string;
  domain: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  areaServed: string;
  contactEmail: string;
  knowsAbout: string[];
  newsletterProvider: NewsletterProvider;
  newsletterActionUrl: string;
  imageDeliveryMode: ImageDeliveryMode;
  preloadCriticalAssets: boolean;
  minifyXml: boolean;
  includeSocialMetaTags: boolean;
  skin: ThemeSkinVariables;
  services: ServiceItem[];
  caseStudies: CaseStudyItem[];
  testimonials: TestimonialItem[];
  insights: InsightPost[];
}

export interface ValidationCheckItem {
  id: string;
  category: 'XML Syntax' | 'Blogger Schema' | 'SEO / AEO / GEO' | 'Performance & Security';
  label: string;
  passed: boolean;
  detail: string;
}

export interface XmlValidationReport {
  wellFormed: boolean;
  parserError: string | null;
  lineCount: number;
  byteSize: number;
  checks: ValidationCheckItem[];
}

export type SeoAuditSeverity = 'pass' | 'warning' | 'critical';

export type SeoAuditCategory =
  | 'Crawlability'
  | 'Structured Data'
  | 'On-Page Semantics'
  | 'Core Web Vitals';

export type SeoFixActionId =
  | 'enable-social-meta'
  | 'enable-preload'
  | 'enable-minify'
  | 'switch-inline-svg'
  | 'fix-https-domain'
  | 'optimize-title-length';

export interface SeoAuditFinding {
  id: string;
  category: SeoAuditCategory;
  title: string;
  severity: SeoAuditSeverity;
  evidence: string;
  recommendation: string;
  impact: 'High' | 'Medium' | 'Low';
  fixActionId?: SeoFixActionId;
  fixActionLabel?: string;
}

export interface SeoAuditSummary {
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  totalChecks: number;
  jsonLdBlockCount: number;
  imgTotalCount: number;
  imgOptimizedCount: number;
  preloadTagCount: number;
  xmlSizeKb: number;
  homepageTitleLength: number;
  findings: SeoAuditFinding[];
}

export interface ConfigSnapshot {
  id: string;
  version: string;
  label: string;
  savedAt: string;
  config: SiteConfig;
}

export type A11yAuditCategory =
  | 'Alt Text & Media'
  | 'Color Contrast'
  | 'ARIA & Landmarks'
  | 'Keyboard & Motion';

export type A11yFixActionId =
  | 'fix-missing-alt'
  | 'fix-aria-labels'
  | 'fix-skip-link'
  | 'fix-reduced-motion'
  | 'fix-contrast-text'
  | 'fix-contrast-primary'
  | 'fix-contrast-secondary'
  | 'fix-contrast-accent';

export interface ContrastCheckItem {
  id: string;
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  passesAA: boolean;
  passesAAA: boolean;
  sampleText: string;
  fixActionId?: A11yFixActionId;
}

export interface A11yAuditFinding {
  id: string;
  category: A11yAuditCategory;
  wcagCriterion: string;
  wcagLevel: 'A' | 'AA';
  title: string;
  severity: 'pass' | 'warning' | 'critical';
  evidence: string;
  recommendation: string;
  fixActionId?: A11yFixActionId;
  fixActionLabel?: string;
}

export interface A11yAuditSummary {
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  totalChecks: number;
  imgTotalCount: number;
  imgWithAltCount: number;
  ariaLabelCount: number;
  landmarkCount: number;
  contrastChecks: ContrastCheckItem[];
  contrastPassedCount: number;
  findings: A11yAuditFinding[];
}

export type PerfSimulationProfile = 'mobile-4g' | 'tablet-wifi' | 'desktop-fast';

export type CoreWebVitalRating = 'good' | 'needs-improvement' | 'poor';

export type PerfSuggestionCategory = 'LCP' | 'FID' | 'CLS' | 'Payload';

export type PerfFixActionId =
  | 'enable-minify'
  | 'enable-preload'
  | 'switch-inline-svg'
  | 'unify-fonts'
  | 'trim-home-blogs';

export interface CoreWebVitalMetric {
  id: 'lcp' | 'fid' | 'cls';
  name: string;
  shortLabel: string;
  value: number;
  displayValue: string;
  unit: string;
  goodThreshold: number;
  poorThreshold: number;
  goodTargetLabel: string;
  rating: CoreWebVitalRating;
  primaryDriver: string;
}

export interface PerfOptimizationSuggestion {
  id: string;
  category: PerfSuggestionCategory;
  title: string;
  status: 'pass' | 'opportunity';
  estimatedSavings: string;
  evidence: string;
  recommendation: string;
  impact: 'High' | 'Medium' | 'Low';
  fixActionId?: PerfFixActionId;
  fixActionLabel?: string;
}

export interface PerformanceSimulationReport {
  profile: PerfSimulationProfile;
  profileLabel: string;
  networkLabel: string;
  overallScore: number;
  overallRating: CoreWebVitalRating;
  lcp: CoreWebVitalMetric;
  fid: CoreWebVitalMetric;
  cls: CoreWebVitalMetric;
  breakdown: {
    xmlTotalKb: number;
    skinCssKb: number;
    inlineJsKb: number;
    jsonLdKb: number;
    markupKb: number;
    mediaPayloadKb: number;
    domNodeEstimate: number;
    preloadCount: number;
    avifWebpPictureCount: number;
    fontFamilyCount: number;
    externalBlockingScripts: number;
  };
  passedCount: number;
  opportunityCount: number;
  suggestions: PerfOptimizationSuggestion[];
}
