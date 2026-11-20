import React from 'react';

/**
 * Strict https:// allowlist for external companion links (AD-16).
 * Rejects http://, javascript:, data:, relative paths, and malformed URLs.
 */
export function isSafeHttpsUrl(url?: string | null): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https:\/\/[^\s]+$/i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Renders safe plain-React inline emphasis (**bold**, *italic*) with zero HTML injection.
 * Raw HTML tags like <script>...</script> are preserved strictly as escaped React text nodes.
 */
function renderInlineNodes(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${tokenIdx}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      nodes.push(
        <em key={`${keyPrefix}-i-${tokenIdx}`}>
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }
    lastIndex = pattern.lastIndex;
    tokenIdx += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

type MarkdownBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string };

function parseCompanionBlocks(raw: string): MarkdownBlock[] {
  const normalized = raw.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const blocks: MarkdownBlock[] = [];
  const rawParagraphs = normalized.split(/\n{2,}/);

  for (const chunk of rawParagraphs) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let paragraphLines: string[] = [];
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (paragraphLines.length > 0) {
        blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') });
        paragraphLines = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        blocks.push({ kind: 'list', items: listItems });
        listItems = [];
      }
    };

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        blocks.push({ kind: 'heading', text: headingMatch[1].trim() });
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        listItems.push(listMatch[1].trim());
        continue;
      }

      flushList();
      paragraphLines.push(line);
    }

    flushParagraph();
    flushList();
  }

  return blocks;
}

export interface CompanionMarkdownProps {
  text?: string | null;
  className?: string;
  headingLevel?: 'h3' | 'h4' | 'h5';
}

/**
 * Safe plain-React structural prose renderer for Companion commentary (AD-16).
 * Supports ### headings, paragraph breaks, - bullet lists, and inline **bold** / *italic*.
 * Never uses dangerouslySetInnerHTML.
 */
export const CompanionMarkdown: React.FC<CompanionMarkdownProps> = ({
  text,
  className,
  headingLevel = 'h4',
}) => {
  if (!text || !text.trim()) {
    return null;
  }

  const blocks = parseCompanionBlocks(text);
  if (blocks.length === 0) {
    return null;
  }

  const HeadingTag = headingLevel;

  return (
    <div className={className ? `companion-markdown ${className}` : 'companion-markdown'}>
      {blocks.map((block, idx) => {
        if (block.kind === 'heading') {
          return (
            <HeadingTag key={`md-h-${idx}`} className="companion-md-heading">
              {renderInlineNodes(block.text, `h-${idx}`)}
            </HeadingTag>
          );
        }

        if (block.kind === 'list') {
          return (
            <ul key={`md-ul-${idx}`} className="companion-md-list">
              {block.items.map((item, itemIdx) => (
                <li key={`md-li-${idx}-${itemIdx}`}>
                  {renderInlineNodes(item, `li-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`md-p-${idx}`} className="companion-md-paragraph">
            {renderInlineNodes(block.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
};

export default CompanionMarkdown;
