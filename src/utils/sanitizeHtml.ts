/**
 * Safe HTML sanitizer for course descriptions and rich text rendering.
 * Strips script tags, iframes, embedded objects, and event handler attributes (e.g., onerror, onclick).
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  let clean = String(html);

  // 1. Remove script, style, iframe, object, embed tags and their contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Remove all on* event handlers (e.g., onerror=, onclick=, onload=)
  clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Remove javascript: pseudo-protocol in links or src
  clean = clean.replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>]*/gi, '');

  return clean;
}
