/**
 * Subresource Integrity for injected plugin and form-resource tags (WP-C4).
 *
 * When the server supplies an `integrity` hash the browser refuses a file
 * that does not match it, and the tag's onerror path runs instead. SRI on a
 * cross-origin script needs a CORS fetch, hence `crossOrigin`; the CDN
 * already answers with Access-Control-Allow-Origin.
 */
export const applyIntegrity = (
  element: HTMLScriptElement | HTMLLinkElement,
  record: { integrity?: string | null } | null | undefined,
): void => {
  const integrity = record?.integrity;
  if (typeof integrity !== 'string' || integrity.length === 0) return;
  element.setAttribute('integrity', integrity);
  element.crossOrigin = 'anonymous';
};
