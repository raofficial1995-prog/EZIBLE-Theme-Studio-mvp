export type RichResultSchemaKey =
  | 'organization'
  | 'breadcrumb'
  | 'article'
  | 'faqPage'
  | 'reviews';

export type RichResultFieldStatus = 'valid' | 'warning' | 'error';

export interface RichResultFieldCheck {
  field: string;
  requirement: 'Required' | 'Recommended';
  status: RichResultFieldStatus;
  valuePreview: string;
  message: string;
}

export interface RichResultValidationResult {
  schemaKey: RichResultSchemaKey;
  schemaLabel: string;
  richResultFeature: string;
  jsonSyntaxValid: boolean;
  syntaxError: string | null;
  eligible: boolean;
  errorCount: number;
  warningCount: number;
  validCount: number;
  parsed: Record<string, unknown> | null;
  checks: RichResultFieldCheck[];
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

function isValidUrl(val: unknown): boolean {
  if (!isNonEmptyString(val)) return false;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val.trim());
}

function isIsoDate(val: unknown): boolean {
  if (!isNonEmptyString(val)) return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
    val.trim()
  );
}

function summarizeValue(val: unknown): string {
  if (val === undefined || val === null) return 'Missing';
  if (typeof val === 'string') {
    return val.length > 64 ? `${val.slice(0, 61)}...` : val;
  }
  if (Array.isArray(val)) {
    return `${val.length} item${val.length === 1 ? '' : 's'}`;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (isNonEmptyString(obj.name)) return obj.name;
    if (isNonEmptyString(obj['@id'])) return obj['@id'];
    if (isNonEmptyString(obj.url)) return obj.url;
    return `{${Object.keys(obj).slice(0, 3).join(', ')}}`;
  }
  return String(val);
}

const SCHEMA_META: Record<
  RichResultSchemaKey,
  { label: string; feature: string }
> = {
  organization: {
    label: 'Organization & ITService',
    feature: 'Knowledge Panel & Brand Logo',
  },
  breadcrumb: {
    label: 'BreadcrumbList',
    feature: 'Breadcrumb Trail Rich Result',
  },
  article: {
    label: 'TechArticle',
    feature: 'Article Rich Snippet',
  },
  faqPage: {
    label: 'FAQPage',
    feature: 'FAQ Rich Result & AEO',
  },
  reviews: {
    label: 'Client Reviews',
    feature: 'Review Rating Snippet',
  },
};

export function validateJsonLdForGoogleRichResults(
  schemaKey: RichResultSchemaKey,
  rawJson: string
): RichResultValidationResult {
  const meta = SCHEMA_META[schemaKey];
  let parsed: Record<string, unknown> | null = null;
  let syntaxError: string | null = null;

  try {
    const obj = JSON.parse(rawJson);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      parsed = obj as Record<string, unknown>;
    } else {
      syntaxError = 'Root JSON-LD payload must be a JSON object.';
    }
  } catch (err) {
    syntaxError = err instanceof Error ? err.message : 'Invalid JSON syntax.';
  }

  if (!parsed) {
    return {
      schemaKey,
      schemaLabel: meta.label,
      richResultFeature: meta.feature,
      jsonSyntaxValid: false,
      syntaxError,
      eligible: false,
      errorCount: 1,
      warningCount: 0,
      validCount: 0,
      parsed: null,
      checks: [
        {
          field: 'JSON Syntax',
          requirement: 'Required',
          status: 'error',
          valuePreview: 'Parse failure',
          message: syntaxError || 'Malformed JSON-LD payload.',
        },
      ],
    };
  }

  const checks: RichResultFieldCheck[] = [];

  // Shared @context check
  const ctx = parsed['@context'];
  const validCtx =
    typeof ctx === 'string' && /^https?:\/\/schema\.org\/?$/i.test(ctx.trim());
  checks.push({
    field: '@context',
    requirement: 'Required',
    status: validCtx ? 'valid' : 'error',
    valuePreview: summarizeValue(ctx),
    message: validCtx
      ? 'Declares standard Schema.org vocabulary.'
      : 'Must be set to "https://schema.org" for Google Rich Results.',
  });

  // Shared @type check
  const rawType = parsed['@type'];
  const typeList = Array.isArray(rawType)
    ? rawType.map(String)
    : isNonEmptyString(rawType)
    ? [rawType]
    : [];
  checks.push({
    field: '@type',
    requirement: 'Required',
    status: typeList.length > 0 ? 'valid' : 'error',
    valuePreview: typeList.length > 0 ? typeList.join(', ') : 'Missing',
    message:
      typeList.length > 0
        ? `Valid entity type declared (${typeList.join(' / ')}).`
        : 'Missing @type declaration.',
  });

  if (schemaKey === 'organization') {
    const hasName = isNonEmptyString(parsed.name);
    checks.push({
      field: 'name',
      requirement: 'Required',
      status: hasName ? 'valid' : 'error',
      valuePreview: summarizeValue(parsed.name),
      message: hasName
        ? 'Primary organization name verified.'
        : 'Google requires organization name for Knowledge Graph matching.',
    });

    const hasUrl = isValidUrl(parsed.url);
    checks.push({
      field: 'url',
      requirement: 'Required',
      status: hasUrl ? 'valid' : 'error',
      valuePreview: summarizeValue(parsed.url),
      message: hasUrl
        ? 'Canonical HTTPS organization URL verified.'
        : 'Provide a valid absolute HTTPS url for your organization.',
    });

    const hasLogo = isValidUrl(parsed.logo) || (typeof parsed.logo === 'object' && parsed.logo !== null);
    checks.push({
      field: 'logo',
      requirement: 'Recommended',
      status: hasLogo ? 'valid' : 'warning',
      valuePreview: summarizeValue(parsed.logo),
      message: hasLogo
        ? 'Organization logo URL present for Google Search brand display.'
        : 'Add a logo URL (>= 112x112px) to qualify for Google Logo Rich Results.',
    });

    const knowsAbout = Array.isArray(parsed.knowsAbout) ? parsed.knowsAbout : [];
    checks.push({
      field: 'knowsAbout',
      requirement: 'Recommended',
      status: knowsAbout.length >= 3 ? 'valid' : 'warning',
      valuePreview: summarizeValue(knowsAbout),
      message:
        knowsAbout.length >= 3
          ? 'Entity expertise topics strengthen AEO & GEO topical authority.'
          : 'List at least 3 expertise topics in knowsAbout.',
    });

    const offerCatalog = parsed.hasOfferCatalog as Record<string, unknown> | undefined;
    const offerCount = Array.isArray(offerCatalog?.itemListElement)
      ? offerCatalog.itemListElement.length
      : 0;
    checks.push({
      field: 'hasOfferCatalog',
      requirement: 'Recommended',
      status: offerCount > 0 ? 'valid' : 'warning',
      valuePreview: offerCount > 0 ? `${offerCount} ITService offers` : 'Missing',
      message:
        offerCount > 0
          ? 'Structured ITService catalog mapped cleanly.'
          : 'Include hasOfferCatalog to expose service lines to search engines.',
    });
  } else if (schemaKey === 'breadcrumb') {
    const items = Array.isArray(parsed.itemListElement)
      ? (parsed.itemListElement as Record<string, unknown>[])
      : [];
    checks.push({
      field: 'itemListElement',
      requirement: 'Required',
      status: items.length >= 2 ? 'valid' : 'error',
      valuePreview: `${items.length} trail items`,
      message:
        items.length >= 2
          ? 'Breadcrumb trail contains at least 2 hierarchy levels.'
          : 'Google Breadcrumb Rich Results require at least 2 ListItem entries.',
    });

    const sequentialPositions =
      items.length > 0 &&
      items.every((item, idx) => Number(item.position) === idx + 1);
    checks.push({
      field: 'ListItem.position',
      requirement: 'Required',
      status: sequentialPositions ? 'valid' : 'error',
      valuePreview: sequentialPositions
        ? items.map((i) => String(i.position)).join(' → ')
        : 'Out of sequence',
      message: sequentialPositions
        ? '1-indexed sequential position integers verified.'
        : 'Each ListItem must have sequential integer positions starting at 1.',
    });

    const allNamedAndLinked =
      items.length > 0 &&
      items.every(
        (item, idx) =>
          isNonEmptyString(item.name) &&
          (idx === items.length - 1 ? true : isValidUrl(item.item))
      );
    checks.push({
      field: 'ListItem.name & item',
      requirement: 'Required',
      status: allNamedAndLinked ? 'valid' : 'error',
      valuePreview: allNamedAndLinked ? 'All labels & URLs valid' : 'Missing label/URL',
      message: allNamedAndLinked
        ? 'All breadcrumb labels and canonical URLs pass Google guidelines.'
        : 'Every non-final ListItem requires both name and a valid absolute item URL.',
    });
  } else if (schemaKey === 'article') {
    const headline = parsed.headline;
    const headlineValid = isNonEmptyString(headline) && headline.trim().length <= 110;
    checks.push({
      field: 'headline',
      requirement: 'Required',
      status: isNonEmptyString(headline)
        ? headlineValid
          ? 'valid'
          : 'warning'
        : 'error',
      valuePreview: isNonEmptyString(headline)
        ? `${headline.trim().length} chars`
        : 'Missing',
      message: !isNonEmptyString(headline)
        ? 'Article Rich Results require a headline.'
        : headlineValid
        ? 'Headline is within Google’s 110-character guidance.'
        : 'Headline exceeds 110 characters and may truncate in Google News/Search.',
    });

    const author = parsed.author as Record<string, unknown> | undefined;
    const authorValid =
      Boolean(author && isNonEmptyString(author.name)) || isNonEmptyString(parsed.author);
    checks.push({
      field: 'author',
      requirement: 'Required',
      status: authorValid ? 'valid' : 'error',
      valuePreview: summarizeValue(parsed.author),
      message: authorValid
        ? 'Attributable Person/Organization author verified for E-E-A-T.'
        : 'Google recommends a named author object with @type and name.',
    });

    const datePubValid = isIsoDate(parsed.datePublished);
    checks.push({
      field: 'datePublished',
      requirement: 'Required',
      status: datePubValid ? 'valid' : 'error',
      valuePreview: summarizeValue(parsed.datePublished),
      message: datePubValid
        ? 'Valid ISO 8601 publication timestamp.'
        : 'datePublished must follow ISO 8601 format (e.g. 2026-11-12T08:00:00Z).',
    });

    const hasImage =
      isValidUrl(parsed.image) ||
      (Array.isArray(parsed.image) && parsed.image.length > 0 && isValidUrl(parsed.image[0]));
    checks.push({
      field: 'image',
      requirement: 'Recommended',
      status: hasImage ? 'valid' : 'warning',
      valuePreview: summarizeValue(parsed.image),
      message: hasImage
        ? 'High-resolution article image URL included for Discover & Rich Cards.'
        : 'Add a high-res image URL (>= 1200px wide recommended) for Google Article thumbnails.',
    });

    const hasDateModified = isIsoDate(parsed.dateModified);
    checks.push({
      field: 'dateModified',
      requirement: 'Recommended',
      status: hasDateModified ? 'valid' : 'warning',
      valuePreview: summarizeValue(parsed.dateModified),
      message: hasDateModified
        ? 'Freshness signal dateModified is valid ISO 8601.'
        : 'Add dateModified in ISO 8601 format to signal updated technical content.',
    });
  } else if (schemaKey === 'faqPage') {
    const questions = Array.isArray(parsed.mainEntity)
      ? (parsed.mainEntity as Record<string, unknown>[])
      : [];
    checks.push({
      field: 'mainEntity',
      requirement: 'Required',
      status: questions.length > 0 ? 'valid' : 'error',
      valuePreview: `${questions.length} Question items`,
      message:
        questions.length > 0
          ? 'FAQPage contains structured Question entities.'
          : 'FAQPage requires a non-empty mainEntity array of Question objects.',
    });

    const validPairs = questions.filter((q) => {
      const ans = q.acceptedAnswer as Record<string, unknown> | undefined;
      return (
        q['@type'] === 'Question' &&
        isNonEmptyString(q.name) &&
        Boolean(ans && ans['@type'] === 'Answer' && isNonEmptyString(ans.text))
      );
    });

    checks.push({
      field: 'Question.name & acceptedAnswer.text',
      requirement: 'Required',
      status: questions.length > 0 && validPairs.length === questions.length ? 'valid' : 'error',
      valuePreview: `${validPairs.length}/${questions.length} valid Q&A pairs`,
      message:
        questions.length > 0 && validPairs.length === questions.length
          ? 'Every Question has a valid Answer object with non-empty text.'
          : 'All Question items must include name and acceptedAnswer { @type: "Answer", text }.',
    });

    checks.push({
      field: 'AEO Depth (>= 2 Questions)',
      requirement: 'Recommended',
      status: questions.length >= 2 ? 'valid' : 'warning',
      valuePreview: `${questions.length} questions`,
      message:
        questions.length >= 2
          ? 'Multiple Q&A pairs maximize AI Overview & People Also Ask eligibility.'
          : 'Include at least 2 domain-specific FAQs per technical article.',
    });
  } else if (schemaKey === 'reviews') {
    const reviewItems = Array.isArray(parsed.itemListElement)
      ? (parsed.itemListElement as Record<string, unknown>[])
      : [];
    checks.push({
      field: 'itemListElement',
      requirement: 'Required',
      status: reviewItems.length > 0 ? 'valid' : 'error',
      valuePreview: `${reviewItems.length} Review entries`,
      message:
        reviewItems.length > 0
          ? 'Contains structured client Review items.'
          : 'Requires at least one Review object in itemListElement.',
    });

    const validRatings = reviewItems.filter((r) => {
      const rating = r.reviewRating as Record<string, unknown> | undefined;
      const val = Number(rating?.ratingValue);
      return Boolean(rating && !Number.isNaN(val) && val >= 1 && val <= 5);
    });
    checks.push({
      field: 'reviewRating.ratingValue',
      requirement: 'Required',
      status:
        reviewItems.length > 0 && validRatings.length === reviewItems.length
          ? 'valid'
          : 'error',
      valuePreview: `${validRatings.length}/${reviewItems.length} valid 1–5 ratings`,
      message:
        validRatings.length === reviewItems.length && reviewItems.length > 0
          ? 'All numeric ratings are within standard 1–5 scale.'
          : 'Every Review requires a numeric reviewRating.ratingValue between 1 and 5.',
    });

    const validAuthors = reviewItems.filter((r) => {
      const author = r.author as Record<string, unknown> | undefined;
      return Boolean(author && isNonEmptyString(author.name) && isNonEmptyString(r.reviewBody));
    });
    checks.push({
      field: 'author.name & reviewBody',
      requirement: 'Required',
      status:
        reviewItems.length > 0 && validAuthors.length === reviewItems.length
          ? 'valid'
          : 'error',
      valuePreview: `${validAuthors.length}/${reviewItems.length} attributed reviews`,
      message:
        validAuthors.length === reviewItems.length && reviewItems.length > 0
          ? 'All reviews include real author attribution and reviewBody text.'
          : 'Google Review Snippets require both author.name and reviewBody.',
    });

    const validTarget = reviewItems.every((r) => Boolean(r.itemReviewed));
    checks.push({
      field: 'itemReviewed',
      requirement: 'Required',
      status: reviewItems.length > 0 && validTarget ? 'valid' : 'error',
      valuePreview: validTarget ? 'Linked to @id Organization' : 'Missing itemReviewed',
      message: validTarget
        ? 'Each Review explicitly links to the reviewed Organization entity.'
        : 'Specify itemReviewed on every Review to pass Google Review Snippet validation.',
    });
  }

  const errorCount = checks.filter((c) => c.status === 'error').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const validCount = checks.filter((c) => c.status === 'valid').length;

  return {
    schemaKey,
    schemaLabel: meta.label,
    richResultFeature: meta.feature,
    jsonSyntaxValid: true,
    syntaxError: null,
    eligible: errorCount === 0,
    errorCount,
    warningCount,
    validCount,
    parsed,
    checks,
  };
}
