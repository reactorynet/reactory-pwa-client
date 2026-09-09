import {
  createDefaultTableHtml,
  buildTableDom,
  tablesToEditorHtml,
  tablesToContentHtml,
  TABLE_EMBED_CLASS,
} from '../editor/blots/tableBlot';

describe('TableBlot serialization and helpers', () => {
  it('creates default table HTML with correct rows and columns', () => {
    const html = createDefaultTableHtml(3, 4, true);
    expect(html).toContain('<table class="reactory-table" border="1">');
    expect(html).toContain('<thead><tr>');
    expect(html).toContain('<th>Header 1</th>');
    expect(html).toContain('<th>Header 4</th>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<td>Cell 2,1</td>');
  });

  it('creates default table HTML without header when includeHeader is false', () => {
    const html = createDefaultTableHtml(2, 2, false);
    expect(html).not.toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<td>Cell 1,1</td>');
  });

  it('converts table HTML to editor embed markup', () => {
    const sourceTable = '<table><thead><tr><th>H1</th></tr></thead><tbody><tr><td>C1</td></tr></tbody></table>';
    const editorHtml = tablesToEditorHtml(sourceTable);

    expect(editorHtml).toContain(TABLE_EMBED_CLASS);
    expect(editorHtml).toContain('data-table-html=');
    expect(editorHtml).toContain('contenteditable="false"');
    expect(editorHtml).toContain('+ Row');
    expect(editorHtml).toContain('+ Col');
  });

  it('converts editor embed markup back to semantic HTML table', () => {
    const sourceTable = '<table class="reactory-table" border="1"><thead><tr><th contenteditable="true">H1</th></tr></thead><tbody><tr><td contenteditable="true">C1</td></tr></tbody></table>';
    const editorHtml = tablesToEditorHtml(sourceTable);
    const contentHtml = tablesToContentHtml(editorHtml);

    expect(contentHtml).not.toContain(TABLE_EMBED_CLASS);
    expect(contentHtml).not.toContain('reactory-table-controls');
    expect(contentHtml).toContain('<table');
    expect(contentHtml).toContain('H1');
    expect(contentHtml).toContain('C1');
  });
});
