import { ContentFormat } from '../format';

/**
 * Smallest comfortable writing area per format, in pixels.
 *
 * Source formats sit in a smaller monospace face and are usually edited a line
 * at a time, so they get a little more room than rich text, whose own default
 * line height already fills the box.
 */
export const FORMAT_FLOORS: Record<ContentFormat, number> = {
  html: 120,
  markdown: 160,
  text: 160,
};

/**
 * Above this, matching the rendered content's height stops being helpful: a
 * long article would open a writing surface taller than the viewport, and the
 * author would have to scroll to find the toolbar they just clicked. Beyond the
 * cap the surface grows to fit as they type instead.
 */
export const MEASURED_HEIGHT_CAP = 640;

export interface SurfaceMinHeightArgs {
  format: ContentFormat;
  /** Height of the rendered content the editor replaced, when known. */
  measuredHeight?: number;
  /** True when editing a translation rather than the source body. */
  isTranslating: boolean;
}

/**
 * The floor for the writing surface.
 *
 * Matching the height of the content being replaced is what stops the page
 * jumping when edit mode opens. It deliberately does not apply to
 * translations: those start empty, so inheriting the source body's height would
 * open a large blank void instead of a box that fits what is actually there.
 */
export const surfaceMinHeight = ({
  format,
  measuredHeight,
  isTranslating,
}: SurfaceMinHeightArgs): number => {
  const floor = FORMAT_FLOORS[format] ?? FORMAT_FLOORS.html;
  if (isTranslating) return floor;
  if (!measuredHeight || measuredHeight <= 0) return floor;
  return Math.max(floor, Math.min(measuredHeight, MEASURED_HEIGHT_CAP));
};

export default surfaceMinHeight;
