import { extractSvgMarkup, sanitizeSvg, toSafeSvg } from '../utils/svgAttribute';

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="#3174b9"/></svg>';

describe('svgAttribute', () => {
  it('extracts from the parser payload shapes', () => {
    expect(extractSvgMarkup({ type: 'svg', svg: ICON })).toBe(ICON);
    expect(extractSvgMarkup(JSON.stringify({ type: 'svg', svg: ICON }))).toBe(ICON);
    expect(extractSvgMarkup(ICON)).toBe(ICON);
    expect(extractSvgMarkup('plain text')).toBeNull();
    expect(extractSvgMarkup({ type: 'other', svg: ICON })).toBeNull();
    expect(extractSvgMarkup(42)).toBeNull();
  });

  it('keeps benign markup intact', () => {
    const safe = sanitizeSvg(ICON);
    expect(safe).toContain('<path');
    expect(safe).toContain('fill="#3174b9"');
  });

  it('strips scripting vectors', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script>' +
      '<a href="javascript:alert(1)"><path d="M0 0" onclick="x()"/></a>' +
      '<image href="https://evil.example/x.png"/><use href="#ok"/></svg>';
    const safe = sanitizeSvg(dirty)!;
    expect(safe).not.toContain('script');
    expect(safe).not.toContain('onload');
    expect(safe).not.toContain('onclick');
    expect(safe).not.toContain('javascript:');
    expect(safe).not.toContain('evil.example');
    expect(safe).toContain('href="#ok"');
  });

  it('rejects non-svg documents', () => {
    expect(sanitizeSvg('<div>nope</div>')).toBeNull();
    expect(toSafeSvg('{"broken json')).toBeNull();
  });
});
