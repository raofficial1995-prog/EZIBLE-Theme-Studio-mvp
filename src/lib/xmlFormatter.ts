/**
 * Blogger-XML-aware Pretty Printer.
 * Consistently formats strict XHTML / Google Blogger v3 XML templates—including
 * minified output, <b:if>/<b:elseif>/<b:else/> branches, <b:skin> CSS CDATA
 * (preserving Blogger Theme Designer <Variable> blocks), JSON-LD scripts, and
 * inline CDATA JavaScript—without altering entity-encoded widget settings.
 */

function formatSkinCss(css: string, baseIndent: string, step: string): string {
  const trimmed = css.trim();
  if (!trimmed) return '';

  const out: string[] = [];
  let depth = 0;
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let parenDepth = 0;

  const pushLine = (text: string, indentLevel: number) => {
    const clean = text.trim();
    if (!clean) return;
    out.push(`${baseIndent}${step.repeat(Math.max(0, indentLevel))}${clean}`);
  };

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const next = trimmed[i + 1];

    // Preserve CSS comments verbatim (critical for Blogger <Variable .../> blocks)
    if (!inSingle && !inDouble && ch === '/' && next === '*') {
      pushLine(current, depth);
      current = '';
      const endIdx = trimmed.indexOf('*/', i + 2);
      const comment = endIdx === -1 ? trimmed.slice(i) : trimmed.slice(i, endIdx + 2);
      const commentLines = comment.split(/\r?\n/);
      commentLines.forEach((cl) => {
        const clTrim = cl.trim();
        if (clTrim) {
          out.push(`${baseIndent}${step.repeat(Math.max(0, depth))}${clTrim}`);
        }
      });
      if (endIdx === -1) break;
      i = endIdx + 1;
      continue;
    }

    if (ch === "'" && !inDouble && trimmed[i - 1] !== '\\') {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle && trimmed[i - 1] !== '\\') {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '(') {
        parenDepth++;
        current += ch;
        continue;
      }
      if (ch === ')') {
        parenDepth = Math.max(0, parenDepth - 1);
        current += ch;
        continue;
      }

      if (parenDepth === 0) {
        if (ch === '{') {
          const selector = current.replace(/\s+/g, ' ').trim();
          pushLine(`${selector} {`, depth);
          current = '';
          depth++;
          continue;
        }
        if (ch === '}') {
          pushLine(current, depth);
          current = '';
          depth = Math.max(0, depth - 1);
          pushLine('}', depth);
          continue;
        }
        if (ch === ';') {
          const decl = `${current.replace(/\s+/g, ' ').trim()};`;
          pushLine(decl, depth);
          current = '';
          continue;
        }
      }
    }

    current += ch;
  }

  pushLine(current, depth);
  return out.join('\n');
}

function formatJsonLdBody(body: string, baseIndent: string, step: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';

  // Temporarily shield Blogger template tags (<b:if ...>, </b:if>, <data:.../>) inside JSON-LD
  const tags: string[] = [];
  const shielded = trimmed.replace(/<\/?(?:b|data):[^>]+>/g, (match) => {
    const token = `__EZ_JSONLD_TAG_${tags.length}__`;
    tags.push(match);
    return token;
  });

  const out: string[] = [];
  let depth = 0;
  let current = '';
  let inString = false;

  const flush = (indentLevel: number) => {
    const clean = current.trim();
    if (clean) {
      out.push(`${baseIndent}${step.repeat(Math.max(0, indentLevel))}${clean}`);
    }
    current = '';
  };

  for (let i = 0; i < shielded.length; i++) {
    const ch = shielded[i];
    if (ch === '"' && shielded[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
      continue;
    }

    if (!inString) {
      if (ch === '[') {
        // Keep primitive-only arrays (e.g. ["Organization", "ProfessionalService"]) on one line
        const closeBracket = shielded.indexOf(']', i + 1);
        if (closeBracket !== -1) {
          const inner = shielded.slice(i + 1, closeBracket);
          if (!inner.includes('{') && !inner.includes('[') && !inner.includes('__EZ_JSONLD_TAG_')) {
            const normalizedInner = inner
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
              .join(', ');
            current += `[${normalizedInner}]`;
            i = closeBracket;
            continue;
          }
        }
        current += ch;
        flush(depth);
        depth++;
        continue;
      }
      if (ch === '{') {
        const rest = shielded.slice(i + 1).trimStart();
        if (rest.startsWith('}')) {
          current += ch;
          continue;
        }
        current += ch;
        flush(depth);
        depth++;
        continue;
      }
      if (ch === '}' || ch === ']') {
        flush(depth);
        depth = Math.max(0, depth - 1);
        // Attach trailing comma if present immediately after closing brace
        let nextIdx = i + 1;
        while (nextIdx < shielded.length && /\s/.test(shielded[nextIdx])) {
          nextIdx++;
        }
        if (shielded[nextIdx] === ',') {
          out.push(`${baseIndent}${step.repeat(depth)}${ch},`);
          i = nextIdx;
        } else {
          out.push(`${baseIndent}${step.repeat(depth)}${ch}`);
        }
        continue;
      }
      if (ch === ',') {
        current += ch;
        flush(depth);
        continue;
      }
      if (ch === ':') {
        current = `${current.trimEnd()}: `;
        continue;
      }
      if (ch === '\n' || ch === '\r') {
        continue;
      }
      if (ch === ' ' || ch === '\t') {
        if (current.length > 0 && !current.endsWith(' ')) {
          current += ' ';
        }
        continue;
      }
    }

    current += ch;
  }

  flush(depth);

  let formatted = out.join('\n');
  tags.forEach((tag, index) => {
    formatted = formatted.replace(`__EZ_JSONLD_TAG_${index}__`, () => tag);
  });
  return formatted;
}

function formatScriptBlock(scriptTag: string, baseIndent: string, step: string): string {
  const match = scriptTag.match(/^(<script\b[^>]*>)([\s\S]*?)(<\/script>)$/i);
  if (!match) return `${baseIndent}${scriptTag.trim()}`;

  const [, openTag, body, closeTag] = match;

  if (/type=['"]application\/ld\+json['"]/i.test(openTag)) {
    const formattedJson = formatJsonLdBody(body, `${baseIndent}${step}`, step);
    return `${baseIndent}${openTag}\n${formattedJson}\n${baseIndent}${closeTag}`;
  }

  // Inline CDATA JS block: preserve semantics and apply consistent base indentation
  const bodyLines = body.trim().split(/\r?\n/);
  const normalizedLines = bodyLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed === '//<![CDATA[' || trimmed === '//]]>') {
      return `${baseIndent}${trimmed}`;
    }
    return `${baseIndent}${step}${trimmed}`;
  });

  // Preserve original relative indentation if already multi-line formatted
  const nonEmptyContent = bodyLines.filter((l) => {
    const t = l.trim();
    return t && t !== '//<![CDATA[' && t !== '//]]>';
  });
  const minLeading = nonEmptyContent.reduce((min, line) => {
    const m = line.match(/^(\s*)/);
    const len = m ? m[1].length : 0;
    return Math.min(min, len);
  }, Number.POSITIVE_INFINITY);

  const reindented =
    Number.isFinite(minLeading) && minLeading > 0
      ? bodyLines
          .map((line) => {
            const t = line.trim();
            if (!t) return '';
            if (t === '//<![CDATA[' || t === '//]]>') return `${baseIndent}${t}`;
            const stripped = line.slice(Math.min(minLeading, line.search(/\S|$/)));
            return `${baseIndent}${step}${stripped}`;
          })
          .join('\n')
      : normalizedLines.join('\n');

  return `${baseIndent}${openTag}\n${reindented}\n${baseIndent}${closeTag}`;
}

function getTagName(tagToken: string): string {
  const m = tagToken.match(/^<\/?\s*([a-zA-Z_][\w:.-]*)/);
  return m ? m[1] : '';
}

const PRESERVE_TEXT_TAGS = new Set([
  'b:widget-setting',
  'textarea',
  'pre',
  'code',
]);

export function prettyPrintBloggerXml(xml: string, indentSize: 2 | 4 = 2): string {
  if (!xml || !xml.trim()) return '';

  const step = ' '.repeat(indentSize);

  interface StashedBlock {
    kind: 'skin' | 'script' | 'comment';
    raw: string;
  }

  const blocks: StashedBlock[] = [];
  const stash = (kind: StashedBlock['kind'], raw: string) => {
    const token = `__EZ_PRETTY_BLOCK_${blocks.length}__`;
    blocks.push({ kind, raw });
    return token;
  };

  // 1. Protect <b:skin><![CDATA[...]]></b:skin>, <script>...</script>, and <!-- comments -->
  let working = xml.replace(
    /<b:skin><!\[CDATA\[[\s\S]*?\]\]><\/b:skin>/gi,
    (match) => stash('skin', match)
  );

  working = working.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    (match) => stash('script', match)
  );

  working = working.replace(
    /<!--[\s\S]*?-->/g,
    (match) => stash('comment', match)
  );

  // 2. Tokenize tags, protected placeholders, and text nodes
  const rawTokens = working.match(/__EZ_PRETTY_BLOCK_\d+__|<[^>]+>|[^<]+/g) || [];

  // Split any text node that happens to wrap a placeholder token
  const tokens: string[] = [];
  for (const tok of rawTokens) {
    if (tok.includes('__EZ_PRETTY_BLOCK_') && !/^__EZ_PRETTY_BLOCK_\d+__$/.test(tok)) {
      const parts = tok.split(/(__EZ_PRETTY_BLOCK_\d+__)/g);
      for (const part of parts) {
        if (part) tokens.push(part);
      }
    } else {
      tokens.push(tok);
    }
  }

  const lines: string[] = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Protected block placeholder
    const blockMatch = trimmed.match(/^__EZ_PRETTY_BLOCK_(\d+)__$/);
    if (blockMatch) {
      const block = blocks[Number(blockMatch[1])];
      const baseIndent = step.repeat(depth);

      if (block.kind === 'skin') {
        const skinMatch = block.raw.match(/^(<b:skin><!\[CDATA\[)([\s\S]*?)(\]\]><\/b:skin>)$/i);
        if (skinMatch) {
          const formattedCss = formatSkinCss(skinMatch[2], `${baseIndent}${step}`, step);
          lines.push(`${baseIndent}${skinMatch[1]}`);
          if (formattedCss) lines.push(formattedCss);
          lines.push(`${baseIndent}${skinMatch[3]}`);
        } else {
          lines.push(`${baseIndent}${block.raw}`);
        }
      } else if (block.kind === 'script') {
        lines.push(formatScriptBlock(block.raw, baseIndent, step));
      } else {
        // Multi-line XML comment
        const commentLines = block.raw.split(/\r?\n/);
        commentLines.forEach((cl, idx) => {
          const ct = cl.trim();
          if (!ct) return;
          lines.push(`${baseIndent}${idx === 0 ? '' : '     '}${ct}`);
        });
      }
      continue;
    }

    // XML declaration or DOCTYPE
    if (/^<\?[\s\S]*\?>$/.test(trimmed) || /^<!DOCTYPE\b/i.test(trimmed)) {
      lines.push(trimmed);
      continue;
    }

    // Blogger branch tags (<b:else/> and <b:elseif .../>) align with parent <b:if>
    if (/^<b:(?:else|elseif)\b[^>]*\/>$/i.test(trimmed)) {
      const branchIndent = step.repeat(Math.max(0, depth - 1));
      lines.push(`${branchIndent}${trimmed}`);
      continue;
    }

    // Closing tag
    if (/^<\//.test(trimmed)) {
      depth = Math.max(0, depth - 1);
      lines.push(`${step.repeat(depth)}${trimmed}`);
      continue;
    }

    // Self-closing tag
    if (/\/>$/.test(trimmed)) {
      lines.push(`${step.repeat(depth)}${trimmed}`);
      continue;
    }

    // Opening tag
    if (/^</.test(trimmed)) {
      const tagName = getTagName(trimmed);
      const lowerTag = tagName.toLowerCase();

      // Check for preserved-text tags (e.g. <b:widget-setting>...</b:widget-setting>)
      if (PRESERVE_TEXT_TAGS.has(lowerTag)) {
        const innerParts: string[] = [];
        let j = i + 1;
        while (j < tokens.length) {
          const candidate = tokens[j].trim();
          if (candidate.toLowerCase() === `</${lowerTag}>`) {
            break;
          }
          innerParts.push(tokens[j]);
          j++;
        }
        if (j < tokens.length && tokens[j].trim().toLowerCase() === `</${lowerTag}>`) {
          lines.push(`${step.repeat(depth)}${trimmed}${innerParts.join('')}${tokens[j].trim()}`);
          i = j;
          continue;
        }
      }

      // Collapse simple inline elements onto one line (<tag>short text / data tag</tag>)
      let j = i + 1;
      const inlineContent: string[] = [];
      let canInline = true;

      while (j < tokens.length) {
        const nextTok = tokens[j];
        const nextTrim = nextTok.trim();

        if (!nextTrim) {
          j++;
          continue;
        }

        if (/^<\/\s*([a-zA-Z_][\w:.-]*)\s*>$/.test(nextTrim)) {
          const closeName = getTagName(nextTrim);
          if (closeName.toLowerCase() === lowerTag) {
            break;
          }
          canInline = false;
          break;
        }

        // Allow text or self-closing <data:.../> inside inline elements
        if (
          !nextTrim.startsWith('<') &&
          !nextTrim.startsWith('__EZ_PRETTY_BLOCK_')
        ) {
          inlineContent.push(nextTrim.replace(/\s+/g, ' '));
          j++;
          continue;
        }
        if (/^<data:[^>]*\/>$/i.test(nextTrim)) {
          inlineContent.push(nextTrim);
          j++;
          continue;
        }

        canInline = false;
        break;
      }

      if (
        canInline &&
        j < tokens.length &&
        getTagName(tokens[j].trim()).toLowerCase() === lowerTag
      ) {
        const combined = `${trimmed}${inlineContent.join(' ')}${tokens[j].trim()}`;
        if (combined.length <= 160) {
          lines.push(`${step.repeat(depth)}${combined}`);
          i = j;
          continue;
        }
      }

      lines.push(`${step.repeat(depth)}${trimmed}`);
      depth++;
      continue;
    }

    // Standalone text node
    lines.push(`${step.repeat(depth)}${trimmed.replace(/\s+/g, ' ')}`);
  }

  return lines.join('\n');
}
