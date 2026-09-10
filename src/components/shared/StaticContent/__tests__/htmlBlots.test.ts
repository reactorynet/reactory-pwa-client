import { fullToEditorHtml, fullToContentHtml } from '../editor/blots';
import { REACTORY_EMBED_CLASS } from '../editor/reactoryBlot';
import { TABLE_EMBED_CLASS } from '../editor/blots/tableBlot';

describe('Combined full HTML round-trip serialization', () => {
  it('converts both <reactory /> tags and <table> tags to embeds for the editor', () => {
    const rawHtml =
      '<h2>Architecture</h2>' +
      '<reactory reactory-component="core.UserProfile@1.0.0" />' +
      '<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Speed</td><td>Fast</td></tr></tbody></table>' +
      '<p>Footer text</p>';

    const editorHtml = fullToEditorHtml(rawHtml);

    expect(editorHtml).toContain(REACTORY_EMBED_CLASS);
    expect(editorHtml).toContain(TABLE_EMBED_CLASS);
    expect(editorHtml).toContain('core.UserProfile@1.0.0');
    expect(editorHtml).toContain('Speed');
  });

  it('restores clean semantic HTML and component tags on save', () => {
    const rawHtml =
      '<h2>Architecture</h2>' +
      '<reactory reactory-component="core.UserProfile@1.0.0" />' +
      '<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Speed</td><td>Fast</td></tr></tbody></table>' +
      '<p>Footer text</p>';

    const editorHtml = fullToEditorHtml(rawHtml);
    const restoredHtml = fullToContentHtml(editorHtml);

    expect(restoredHtml).not.toContain(REACTORY_EMBED_CLASS);
    expect(restoredHtml).not.toContain(TABLE_EMBED_CLASS);
    expect(restoredHtml).toContain('<reactory');
    expect(restoredHtml).toContain('reactory-component="core.UserProfile@1.0.0"');
    expect(restoredHtml).toContain('<table');
    expect(restoredHtml).toContain('Metric');
    expect(restoredHtml).toContain('Speed');
  });
});
