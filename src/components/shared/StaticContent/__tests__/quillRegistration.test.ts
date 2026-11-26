import { Quill } from 'react-quill-new';
import { registerAllCustomBlots, fullToEditorHtml, fullToContentHtml } from '../editor/blots';

/**
 * The custom blots and attributors register against whatever Quill the editor
 * package ships. Registration swallows its own errors so a failure cannot stop
 * the editor loading, which also means a Quill upgrade that changes the
 * Parchment API fails silently: styles and embeds are simply dropped on paste.
 * These tests load content through a real Quill instance and check it survives.
 */

const load = (html: string): string => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const quill = new Quill(host);
  quill.clipboard.dangerouslyPasteHTML(fullToEditorHtml(html));
  const result = fullToContentHtml(quill.root.innerHTML);
  host.remove();
  return result;
};

describe('custom Quill registrations', () => {
  beforeAll(() => {
    registerAllCustomBlots();
  });

  it('keeps block alignment as an inline style', () => {
    expect(load('<p style="text-align: center">Centred</p>')).toContain('text-align: center');
  });

  it('keeps inline colour as an inline style', () => {
    expect(load('<p><span style="color: rgb(255, 0, 0)">Red</span></p>')).toContain('color: rgb(255, 0, 0)');
  });

  it('keeps image attributes', () => {
    const html = load('<p><img src="https://example.test/a.png" alt="Alt text" width="120"></p>');
    expect(html).toContain('alt="Alt text"');
    expect(html).toContain('width="120"');
  });

  it('keeps horizontal rules', () => {
    expect(load('<p>Above</p><hr><p>Below</p>')).toContain('<hr');
  });

  it('keeps tables', () => {
    const html = load('<table><tbody><tr><td>Cell</td></tr></tbody></table>');
    expect(html).toContain('<table');
    expect(html).toContain('Cell');
  });

  it('keeps reactory component tags', () => {
    const html = load('<p>Before</p><reactory reactory-component="core.Label@1.0.0" /><p>After</p>');
    expect(html).toContain('reactory-component="core.Label@1.0.0"');
  });
});
