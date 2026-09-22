import type { CSSProperties } from 'react';

/** The MUI input variants a field label can be rendered against. */
export type FieldLabelVariant = 'outlined' | 'filled' | 'standard';

/**
 * A field label must never paint its own background: it should show whatever
 * surface the field is sitting on.
 *
 * An `outlined` label is positioned in the "notch" - the gap MUI cuts in the
 * fieldset border precisely so the label does not collide with the border. That
 * gap is a real hole in the border, so a transparent label already inherits the
 * surrounding surface, whether that is `background.default`, a `Card` (which in
 * dark mode carries an elevation overlay), or a `Paper` with a custom colour.
 *
 * Painting a colour here - which the field template historically did with
 * `palette.background.paper` - only looked correct in light mode, where every
 * surface in the theme is white. On a dark theme the painted patch was visibly
 * different from the surface behind it.
 */
export const TRANSPARENT_LABEL_BACKGROUND = 'transparent';

export interface FieldLabelStyleOptions {
  /** The resolved input variant for this field. */
  variant?: FieldLabelVariant;
  /**
   * Styles merged last, so a form can still override anything resolved here
   * (from `ui:options.labelStyle` or `ui:options.labelProps.style`).
   */
  style?: CSSProperties;
  /**
   * Reinstates an opaque shield behind the label. Only needed by a widget that
   * renders a label *without* cutting the fieldset notch, where the border would
   * otherwise run through the label text.
   */
  background?: CSSProperties['backgroundColor'];
}

/**
 * Resolves the inline style for a field label.
 *
 * Every label-rendering path (the shared field template, and the widgets that
 * render their own label) should go through this so they all inherit the
 * surface consistently rather than each hard-coding a colour.
 */
export const resolveFieldLabelStyle = ({
  variant,
  style,
  background,
}: FieldLabelStyleOptions = {}): CSSProperties => ({
  ...(variant === 'outlined'
    ? { backgroundColor: background ?? TRANSPARENT_LABEL_BACKGROUND }
    : {}),
  ...(style || {}),
});

export default resolveFieldLabelStyle;
