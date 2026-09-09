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

  // Ensure cells have contenteditable="true" for inline typing
  table.querySelectorAll('th, td').forEach((cell) => {
    cell.setAttribute('contenteditable', 'true');
    if (!cell.textContent?.trim()) {
      cell.innerHTML = cell.innerHTML || '<br>';
    }
  });

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
 * Attaches interactive manipulation controls to the table embed element:
 * Add/remove rows, add/remove columns, delete table.
 */
const attachTableInteractivity = (wrapper: HTMLElement): void => {
  const getTable = (): HTMLTableElement | null => wrapper.querySelector('table');

  const syncHtml = () => {
    const table = getTable();
    if (!table) return;

    // Clone table and clean editor-only attributes
    const clone = table.cloneNode(true) as HTMLTableElement;
    clone.querySelectorAll('th, td').forEach((cell) => {
      cell.removeAttribute('contenteditable');
      if (cell.innerHTML === '<br>') cell.innerHTML = '';
    });
    wrapper.setAttribute('data-table-html', clone.outerHTML);
  };

  // Sync content on cell edits
  wrapper.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'TD' || target.tagName === 'TH')) {
      syncHtml();
    }
  });

  wrapper.addEventListener('blur', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'TD' || target.tagName === 'TH')) {
      syncHtml();
    }
  }, true);

  // Button actions
  wrapper.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest('button[data-table-action]') as HTMLButtonElement;
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const action = target.getAttribute('data-table-action');
    const table = getTable();
    if (!table) return;

    if (action === 'add-row') {
      const tbody = table.querySelector('tbody') || table;
      const rows = table.querySelectorAll('tr');
      const colsCount = rows[0]?.querySelectorAll('th, td')?.length || 3;
      const newRow = document.createElement('tr');
      for (let i = 0; i < colsCount; i++) {
        const td = document.createElement('td');
        td.setAttribute('contenteditable', 'true');
        td.innerHTML = '<br>';
        newRow.appendChild(td);
      }
      tbody.appendChild(newRow);
      syncHtml();
    } else if (action === 'add-col') {
      table.querySelectorAll('tr').forEach((row) => {
        const isHeader = row.closest('thead') !== null;
        const cell = document.createElement(isHeader ? 'th' : 'td');
        cell.setAttribute('contenteditable', 'true');
        cell.innerHTML = isHeader ? 'New Header' : '<br>';
        row.appendChild(cell);
      });
      syncHtml();
    } else if (action === 'del-row') {
      const rows = table.querySelectorAll('tr');
      if (rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        lastRow.parentNode?.removeChild(lastRow);
        syncHtml();
      }
    } else if (action === 'del-col') {
      const rows = table.querySelectorAll('tr');
      if (rows.length > 0) {
        const firstRowCells = rows[0].querySelectorAll('th, td');
        if (firstRowCells.length > 1) {
          const colIdx = firstRowCells.length - 1;
          rows.forEach((row) => {
            const cells = row.querySelectorAll('th, td');
            if (cells[colIdx]) cells[colIdx].parentNode?.removeChild(cells[colIdx]);
          });
          syncHtml();
        }
      }
    } else if (action === 'del-table') {
      wrapper.parentNode?.removeChild(wrapper);
    }
  });
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
        node.setAttribute('contenteditable', 'false');

        let rawHtml = '';
        if (typeof value === 'string') {
          rawHtml = value;
        } else if (value && typeof value === 'object') {
          rawHtml = value.html || createDefaultTableHtml(value.rows || 3, value.cols || 3, value.header !== false);
        } else {
          rawHtml = createDefaultTableHtml();
        }

        const tableDom = buildTableDom(rawHtml);
        node.setAttribute('data-table-html', tableDom.outerHTML);

        // Render action toolbar header
        const controls = document.createElement('div');
        controls.className = 'reactory-table-controls';
        controls.setAttribute('contenteditable', 'false');
        controls.innerHTML = `
          <span class="reactory-table-badge">Table</span>
          <button type="button" data-table-action="add-row" title="Add row below">+ Row</button>
          <button type="button" data-table-action="add-col" title="Add column right">+ Col</button>
          <button type="button" data-table-action="del-row" title="Remove last row">- Row</button>
          <button type="button" data-table-action="del-col" title="Remove last column">- Col</button>
          <button type="button" data-table-action="del-table" class="reactory-table-del" title="Delete entire table">✕</button>
        `;

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'reactory-table-scroll';
        scrollContainer.appendChild(tableDom);

        node.appendChild(controls);
        node.appendChild(scrollContainer);

        attachTableInteractivity(node);

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
 */
export const tablesToEditorHtml = (html: string): string => {
  if (!html || html.indexOf('<table') < 0) return html || '';

  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (match) => {
    const encoded = match.replace(/"/g, '&quot;');
    const tableDom = buildTableDom(match);
    return (
      `<div class="${TABLE_EMBED_CLASS}" data-table-html="${encoded}" contenteditable="false">` +
      `<div class="reactory-table-controls" contenteditable="false">` +
      `<span class="reactory-table-badge">Table</span>` +
      `<button type="button" data-table-action="add-row" title="Add row below">+ Row</button>` +
      `<button type="button" data-table-action="add-col" title="Add column right">+ Col</button>` +
      `<button type="button" data-table-action="del-row" title="Remove last row">- Row</button>` +
      `<button type="button" data-table-action="del-col" title="Remove last column">- Col</button>` +
      `<button type="button" data-table-action="del-table" class="reactory-table-del" title="Delete entire table">✕</button>` +
      `</div>` +
      `<div class="reactory-table-scroll">${tableDom.outerHTML}</div>` +
      `</div>`
    );
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
    const stored = node.getAttribute('data-table-html');
    const table = node.querySelector('table');
    let finalTableHtml = stored;

    if (!finalTableHtml && table) {
      const clone = table.cloneNode(true) as HTMLElement;
      clone.classList.remove('reactory-table');
      clone.querySelectorAll('th, td').forEach((cell) => {
        cell.removeAttribute('contenteditable');
      });
      finalTableHtml = clone.outerHTML;
    }

    if (finalTableHtml) {
      const temp = document.createElement('div');
      temp.innerHTML = finalTableHtml;
      const cleanTable = temp.querySelector('table') || temp.firstChild;
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
