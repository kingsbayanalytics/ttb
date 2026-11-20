/**
 * Pure offline validator for curated r/Bible community companion entries and bundles.
 * Never performs outbound HTTP requests or scraping (AD-13).
 */

export const MAX_COMMUNITY_QUOTE_EXCERPT_LENGTH = 300;
export const REDDIT_PERMALINK_REGEX =
  /^https:\/\/(?:www\.)?reddit\.com\/r\/[A-Za-z0-9_]+\/comments\/[A-Za-z0-9_]+(?:\/\S*)?$/i;
export const REDDIT_AUTHOR_HANDLE_REGEX = /^u\/[A-Za-z0-9_-]+$/;
export const REDDIT_SUBREDDIT_REGEX = /^r\/[A-Za-z0-9_]+$/;

export interface CommunityValidationIssue {
  entryIndex: number;
  field: string;
  message: string;
}

export interface CommunityValidationResult {
  valid: boolean;
  errors: CommunityValidationIssue[];
}

export function validateCommunityEntry(
  entry: Record<string, any>,
  entryIndex = 0
): CommunityValidationIssue[] {
  const errors: CommunityValidationIssue[] = [];
  const push = (field: string, message: string) => {
    errors.push({ entryIndex, field, message });
  };

  if (!entry || typeof entry !== 'object') {
    push('entry', 'Community entry must be a JSON object');
    return errors;
  }

  if (entry.lens !== 'community') {
    push('lens', `Community entry must have lens "community", got "${String(entry.lens ?? '')}"`);
  }

  if (entry.visibility !== 'private-owner') {
    push(
      'visibility',
      `Community entry must have visibility "private-owner", got "${String(entry.visibility ?? '')}"`
    );
  }

  if (typeof entry.title !== 'string' || entry.title.trim().length === 0) {
    push('title', 'Community entry requires a non-empty title');
  }

  if (typeof entry.summary !== 'string' || entry.summary.trim().length === 0) {
    push('summary', 'Community entry requires a non-empty editorial summary');
  }

  if (typeof entry.body !== 'string' || entry.body.trim().length === 0) {
    push('body', 'Community entry requires a non-empty editorial body');
  }

  if (entry.quoteExcerpt !== undefined && entry.quoteExcerpt !== null) {
    if (typeof entry.quoteExcerpt !== 'string') {
      push('quoteExcerpt', 'quoteExcerpt must be a string when provided');
    } else if (entry.quoteExcerpt.length > MAX_COMMUNITY_QUOTE_EXCERPT_LENGTH) {
      push(
        'quoteExcerpt',
        `quoteExcerpt length (${entry.quoteExcerpt.length}) exceeds maximum of ${MAX_COMMUNITY_QUOTE_EXCERPT_LENGTH} characters`
      );
    }
  }

  if (typeof entry.externalUrl !== 'string' || !REDDIT_PERMALINK_REGEX.test(entry.externalUrl.trim())) {
    push(
      'externalUrl',
      'Community entry requires a valid https://www.reddit.com/r/<subreddit>/comments/<id>/... permalink'
    );
  }

  const source = entry.source;
  if (!source || typeof source !== 'object') {
    push('source', 'Community entry requires a source attribution object');
  } else {
    if (typeof source.subreddit !== 'string' || !REDDIT_SUBREDDIT_REGEX.test(source.subreddit.trim())) {
      push('source.subreddit', 'source.subreddit must be formatted like "r/Bible"');
    }

    if (
      typeof source.authorHandle !== 'string' ||
      !REDDIT_AUTHOR_HANDLE_REGEX.test(source.authorHandle.trim())
    ) {
      push('source.authorHandle', 'source.authorHandle must be formatted like "u/<handle>"');
    }

    if (!source.retrievedAt) {
      push('source.retrievedAt', 'source.retrievedAt ISO timestamp is required');
    } else {
      const parsedDate =
        source.retrievedAt instanceof Date
          ? source.retrievedAt
          : new Date(String(source.retrievedAt));
      if (Number.isNaN(parsedDate.getTime())) {
        push('source.retrievedAt', `source.retrievedAt is not a valid date: "${String(source.retrievedAt)}"`);
      }
    }
  }

  return errors;
}

export function validateCommunityBundle(bundle: Record<string, any>): CommunityValidationResult {
  const errors: CommunityValidationIssue[] = [];

  if (!bundle || typeof bundle !== 'object') {
    return {
      valid: false,
      errors: [{ entryIndex: -1, field: 'bundle', message: 'Bundle must be a JSON object' }],
    };
  }

  if (bundle.visibility !== 'private-owner') {
    errors.push({
      entryIndex: -1,
      field: 'visibility',
      message: `Community bundle top-level visibility must be "private-owner", got "${String(bundle.visibility ?? '')}"`,
    });
  }

  if (!Array.isArray(bundle.entries) || bundle.entries.length === 0) {
    errors.push({
      entryIndex: -1,
      field: 'entries',
      message: 'Community bundle must contain a non-empty entries array',
    });
    return { valid: false, errors };
  }

  bundle.entries.forEach((entry: Record<string, any>, idx: number) => {
    const mergedEntry = {
      ...entry,
      visibility: entry?.visibility ?? bundle.visibility,
      source: {
        ...(bundle.source && typeof bundle.source === 'object' ? bundle.source : {}),
        ...(entry?.source && typeof entry.source === 'object' ? entry.source : {}),
      },
    };
    errors.push(...validateCommunityEntry(mergedEntry, idx));
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
