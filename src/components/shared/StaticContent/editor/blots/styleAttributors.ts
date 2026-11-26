import { Quill } from 'react-quill-new';

let registered = false;

/**
 * Registers style-based Parchment attributors for Quill.
 *
 * Quill defaults to class-based attributors for alignment and font sizing
 * (e.g. `ql-align-center`), which breaks outside Quill's CSS bundle.
 * Style attributors emit standard inline CSS (`style="text-align: center"`),
 * making the resulting HTML clean, portable, and responsive across all viewports.
 */
export const registerStyleAttributors = (): void => {
  if (registered || !Quill) return;

  try {
    const Parchment: any = Quill.import('parchment');
    // Quill 2 (Parchment 3) exports `StyleAttributor`; Quill 1 nested it as
    // `Attributor.Style`.
    const StyleAttributor = Parchment?.StyleAttributor || Parchment?.Attributor?.Style;
    if (!StyleAttributor || !Parchment.Scope) return;

    // Block text alignment
    const AlignStyle = new StyleAttributor('align', 'text-align', {
      scope: Parchment.Scope.BLOCK,
      whitelist: ['left', 'center', 'right', 'justify'],
    });

    // Inline text color
    const ColorStyle = new StyleAttributor('color', 'color', {
      scope: Parchment.Scope.INLINE,
    });

    // Inline background color (highlight)
    const BackgroundStyle = new StyleAttributor('background', 'background-color', {
      scope: Parchment.Scope.INLINE,
    });

    // Inline font size
    const SizeStyle = new StyleAttributor('size', 'font-size', {
      scope: Parchment.Scope.INLINE,
      whitelist: ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem', 'small', 'normal', 'large', 'huge'],
    });

    // Text direction (LTR / RTL)
    const DirectionStyle = new StyleAttributor('direction', 'direction', {
      scope: Parchment.Scope.BLOCK,
      whitelist: ['rtl', 'ltr'],
    });

    Quill.register(AlignStyle, true);
    Quill.register(ColorStyle, true);
    Quill.register(BackgroundStyle, true);
    Quill.register(SizeStyle, true);
    Quill.register(DirectionStyle, true);

    registered = true;
  } catch (err) {
    // Fail silently if Quill is unavailable or already registered
    registered = false;
  }
};
