import { Quill } from 'react-quill';

export const TABLE_EMBED_CLASS = 'reactory-table-embed';
export const TABLE_EMBED_BLOT = 'table-embed';

let registered = false;

/**
 * Normalises an HTML table string so all cells are directly editable
 * and properly structured.
 */
export const buildTableDom = (tableHtml: string): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = tableHtml.trim();
  const table = container.querySelector('table') || document.createElement('table');

  table.classList.add('reactory-table');
  if (!table.getAttribute('border')) {
    table.setAttribute('border', '1');
  }

  return table;
};

/**
 * Creates default HTML for a new table of rows x cols.
 */
export const createDefaultTableHtml = (
  rows: number = 3,
  cols: number = 3,
  includeHeader: boolean = true
): string => {
  let html = '<table class="reactory-table" border="1">';
  let startRow = 0;

  if (includeHeader) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) {
      html += `<th>Header ${c + 1}</th>`;
    }
    html += '</tr></thead>';
    startRow = 1;
  }

  html += '<tbody>';
  for (let r = startRow; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td>Cell ${r + 1},${c + 1}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
};

/**
 * Registers the Table BlockEmbed blot with Quill.
 */
export const registerTableBlot = (): void => {
  if (registered || !Quill) return;

  try {
    const BlockEmbed: any = Quill.import('blots/block/embed');

    class TableBlot extends BlockEmbed {
      static blotName = TABLE_EMBED_BLOT;
      static tagName = 'DIV';
      static className = TABLE_EMBED_CLASS;

      static create(value: any) {
        const node: HTMLElement = super.create(value);
        let rawHtml = '';
        if (typeof value === 'string') {
          rawHtml = value;
        } else if (value && typeof value === 'object') {
          rawHtml = value.html || createDefaultTableHtml(value.rows || 3, value.cols || 3, value.header !== false);
        } else {
          rawHtml = createDefaultTableHtml();
        }

        const encoded = rawHtml.replace(/"/g, '&quot;');
        node.setAttribute('data-table-html', encoded);
        node.setAttribute('contenteditable', 'false');
        node.innerHTML = rawHtml;
        return node;
      }

      static value(node: HTMLElement) {
        return {
          html: node.getAttribute('data-table-html') || node.querySelector('table')?.outerHTML || '',
        };
      }
    }

    Quill.register(TableBlot, true);
    registered = true;
  } catch (e) {
    registered = false;
  }
};

/**
 * Converts standard `<table>...</table>` markup into the embed markup Quill understands.
 * Prevents recursive wrapping if table is already within an embed.
 */
export const tablesToEditorHtml = (html: string): string => {
  if (!html || html.indexOf('<table') < 0) return html || '';
  if (html.indexOf(TABLE_EMBED_CLASS) >= 0) return html;

  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (match) => {
    const encoded = match.replace(/"/g, '&quot;');
    return `<div class="${TABLE_EMBED_CLASS}" data-table-html="${encoded}" contenteditable="false">${match}</div>`;
  });
};

/**
 * Converts table embeds back to pure, semantic HTML `<table>` elements for persistence.
 */
export const tablesToContentHtml = (html: string): string => {
  if (!html || html.indexOf(TABLE_EMBED_CLASS) < 0) return html || '';

  if (typeof document === 'undefined') return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll(`.${TABLE_EMBED_CLASS}`).forEach((node) => {
    const table = node.querySelector('table');
    const stored = node.getAttribute('data-table-html');

    if (table) {
      const clone = table.cloneNode(true) as HTMLElement;
      clone.classList.remove('reactory-table');
      clone.removeAttribute('contenteditable');
      clone.querySelectorAll('th, td').forEach((cell) => {
        cell.removeAttribute('contenteditable');
        if (cell.innerHTML === '<br>') cell.innerHTML = '';
      });
      node.replaceWith(clone);
    } else if (stored) {
      const temp = document.createElement('div');
      temp.innerHTML = stored;
      const cleanTable = temp.querySelector('table');
      if (cleanTable) {
        node.replaceWith(cleanTable);
      } else {
        node.remove();
      }
    } else {
      node.remove();
    }
  });

  return container.innerHTML;
};
