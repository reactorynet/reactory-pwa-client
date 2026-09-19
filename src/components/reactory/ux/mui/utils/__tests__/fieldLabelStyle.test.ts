import {
  resolveFieldLabelStyle,
  TRANSPARENT_LABEL_BACKGROUND,
} from '../fieldLabelStyle';

/**
 * Field labels must show the surface they sit on. The previous implementation
 * painted `palette.background.paper`, which only matched in light mode where
 * every theme surface is white - in dark mode a field on a Card (elevation
 * overlay) or on `background.default` showed a contrasting patch behind the
 * label.
 */
describe('resolveFieldLabelStyle', () => {
  it('keeps an outlined label transparent so the surface shows through', () => {
    const style = resolveFieldLabelStyle({ variant: 'outlined' });

    expect(style.backgroundColor).toBe(TRANSPARENT_LABEL_BACKGROUND);
    expect(style.backgroundColor).toBe('transparent');
  });

  it('never paints an opaque palette colour by default', () => {
    (['outlined', 'filled', 'standard', undefined] as const).forEach((variant) => {
      const style = resolveFieldLabelStyle({ variant });

      expect(
        style.backgroundColor === undefined || style.backgroundColor === 'transparent'
      ).toBe(true);
    });
  });

  it('leaves filled and standard labels untouched', () => {
    expect(resolveFieldLabelStyle({ variant: 'filled' })).not.toHaveProperty('backgroundColor');
    expect(resolveFieldLabelStyle({ variant: 'standard' })).not.toHaveProperty('backgroundColor');
  });

  it('merges extra styles last so a caller can override anything', () => {
    const style = resolveFieldLabelStyle({
      variant: 'outlined',
      style: { padding: '4px', marginLeft: '-4px' },
    });

    expect(style.backgroundColor).toBe('transparent');
    expect(style.padding).toBe('4px');
    expect(style.marginLeft).toBe('-4px');
  });

  it('lets a form opt back in to an opaque shield for the label', () => {
    // Escape hatch for a widget that renders a label without cutting the notch,
    // where the border would otherwise run through the label text.
    const shielded = resolveFieldLabelStyle({ variant: 'outlined', background: '#123456' });
    expect(shielded.backgroundColor).toBe('#123456');

    const overridden = resolveFieldLabelStyle({
      variant: 'outlined',
      style: { backgroundColor: '#abcdef' },
    });
    expect(overridden.backgroundColor).toBe('#abcdef');
  });
});
