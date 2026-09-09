import { Quill } from 'react-quill';

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
    if (!Parchment || !Parchment.Attributor || !Parchment.Attributor.Style) return;

    // Block text alignment
    const AlignStyle = new Parchment.Attributor.Style('align', 'text-align', {
      scope: Parchment.Scope.BLOCK,
      whitelist: ['left', 'center', 'right', 'justify'],
    });

    // Inline text color
    const ColorStyle = new Parchment.Attributor.Style('color', 'color', {
      scope: Parchment.Scope.INLINE,
    });

    // Inline background color (highlight)
    const BackgroundStyle = new Parchment.Attributor.Style('background', 'background-color', {
      scope: Parchment.Scope.INLINE,
    });

    // Inline font size
    const SizeStyle = new Parchment.Attributor.Style('size', 'font-size', {
      scope: Parchment.Scope.INLINE,
      whitelist: ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem', 'small', 'normal', 'large', 'huge'],
    });

    // Text direction (LTR / RTL)
    const DirectionStyle = new Parchment.Attributor.Style('direction', 'direction', {
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
