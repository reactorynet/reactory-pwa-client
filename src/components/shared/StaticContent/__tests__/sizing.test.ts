import surfaceMinHeight, {
  FORMAT_FLOORS,
  MEASURED_HEIGHT_CAP,
} from '../editor/sizing';

describe('inline editor surface sizing', () => {
  describe('without a measured height', () => {
    it('falls back to the per-format floor', () => {
      expect(surfaceMinHeight({ format: 'html', isTranslating: false })).toBe(FORMAT_FLOORS.html);
      expect(surfaceMinHeight({ format: 'markdown', isTranslating: false })).toBe(
        FORMAT_FLOORS.markdown
      );
      expect(surfaceMinHeight({ format: 'text', isTranslating: false })).toBe(FORMAT_FLOORS.text);
    });

    it('treats a zero or negative measurement as no measurement', () => {
      expect(surfaceMinHeight({ format: 'html', measuredHeight: 0, isTranslating: false })).toBe(
        FORMAT_FLOORS.html
      );
      expect(surfaceMinHeight({ format: 'html', measuredHeight: -10, isTranslating: false })).toBe(
        FORMAT_FLOORS.html
      );
    });
  });

  describe('with a measured height', () => {
    it('matches the height of the content it replaces, so the page does not jump', () => {
      expect(surfaceMinHeight({ format: 'html', measuredHeight: 380, isTranslating: false })).toBe(
        380
      );
    });

    it('never drops below the format floor for short content', () => {
      // A one-line snippet would otherwise open a box too small to click into.
      expect(surfaceMinHeight({ format: 'markdown', measuredHeight: 24, isTranslating: false })).toBe(
        FORMAT_FLOORS.markdown
      );
    });

    it('caps very tall content so the toolbar stays reachable', () => {
      expect(surfaceMinHeight({ format: 'html', measuredHeight: 5000, isTranslating: false })).toBe(
        MEASURED_HEIGHT_CAP
      );
    });

    it('uses the measurement exactly at the cap boundary', () => {
      expect(
        surfaceMinHeight({ format: 'html', measuredHeight: MEASURED_HEIGHT_CAP, isTranslating: false })
      ).toBe(MEASURED_HEIGHT_CAP);
    });
  });

  describe('when editing a translation', () => {
    it('ignores the source height so an empty translation is not a large void', () => {
      expect(surfaceMinHeight({ format: 'html', measuredHeight: 900, isTranslating: true })).toBe(
        FORMAT_FLOORS.html
      );
    });

    it('still respects the per-format floor', () => {
      expect(
        surfaceMinHeight({ format: 'markdown', measuredHeight: 900, isTranslating: true })
      ).toBe(FORMAT_FLOORS.markdown);
    });
  });

  it('falls back to the html floor for an unrecognised format', () => {
    expect(
      surfaceMinHeight({ format: 'nonsense' as any, isTranslating: false })
    ).toBe(FORMAT_FLOORS.html);
  });
});
