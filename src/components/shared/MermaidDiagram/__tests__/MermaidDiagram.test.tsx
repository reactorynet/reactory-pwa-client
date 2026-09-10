import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import mermaid from 'mermaid';
import {
  MermaidDiagram,
  sanitizeMermaidSource,
  repairMermaidSyntax,
  detectDiagramType,
  getDiagramImageFilename,
  copyImageToClipboard,
  downloadImageData,
  captureViewportImage,
  sanitizeSvgForRasterization,
  base64ToBlob,
} from '../MermaidDiagram';

const SAMPLE_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    scale: jest.fn(),
  });
  HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue(SAMPLE_PNG_BASE64);
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
});

describe('MermaidDiagram utilities', () => {
  describe('sanitizeMermaidSource', () => {
    it('strips ```mermaid code fences', () => {
      const input = '```mermaid\ngraph TD\n  A --> B\n```';
      expect(sanitizeMermaidSource(input)).toBe('graph TD\n  A --> B');
    });

    it('strips generic ``` code fences', () => {
      const input = '```\nflowchart LR\n  X --> Y\n```';
      expect(sanitizeMermaidSource(input)).toBe('flowchart LR\n  X --> Y');
    });

    it('handles clean code without fences', () => {
      const input = 'flowchart TD\n  A --> B';
      expect(sanitizeMermaidSource(input)).toBe('flowchart TD\n  A --> B');
    });

    it('handles empty input gracefully', () => {
      expect(sanitizeMermaidSource('')).toBe('');
      expect(sanitizeMermaidSource('   ')).toBe('');
      expect(sanitizeMermaidSource(null as any)).toBe('');
    });
  });

  describe('repairMermaidSyntax', () => {
    it('leaves standard valid labels without special characters untouched', () => {
      const input = 'flowchart TD\n  A[Some label] --> B[Other label]';
      expect(repairMermaidSyntax(input)).toBe('flowchart TD\n  A[Some label] --> B[Other label]');
    });

    it('quotes node labels containing round braces: [Some label (xxxx)] -> ["Some label (xxxx)"]', () => {
      const input = 'flowchart TD\n  A[Some label (xxxx)] --> B[Valid Label]';
      expect(repairMermaidSyntax(input)).toBe('flowchart TD\n  A["Some label (xxxx)"] --> B[Valid Label]');
    });

    it('preserves already quoted labels: ["Some label (xxxx)"]', () => {
      const input = 'flowchart TD\n  A["Some label (xxxx)"] --> B["Another (Test)"]';
      expect(repairMermaidSyntax(input)).toBe('flowchart TD\n  A["Some label (xxxx)"] --> B["Another (Test)"]');
    });

    it('quotes special characters across all node shapes (stadium, cylinder, circle, rhombus, hexagon)', () => {
      const input = [
        'flowchart TD',
        '  A([Stadium (Primary)])',
        '  B[(Cylinder (DB))]',
        '  C[[Subroutine (Process)]]',
        '  D((Circle (Node)))',
        '  E{Decision (Check)}',
        '  F{{Hexagon (Task)}}',
      ].join('\n');

      const expected = [
        'flowchart TD',
        '  A(["Stadium (Primary)"])',
        '  B[("Cylinder (DB)")]',
        '  C[["Subroutine (Process)"]]',
        '  D(("Circle (Node)"))',
        '  E{"Decision (Check)"}',
        '  F{{"Hexagon (Task)"}}',
      ].join('\n');

      expect(repairMermaidSyntax(input)).toBe(expected);
    });

    it('repairs multiple chained nodes with parentheses on a single line', () => {
      const input = 'flowchart LR\n  A[User (Admin)] --> B[API (Node.js)] --> C[(DB (Postgres))]';
      const expected = 'flowchart LR\n  A["User (Admin)"] --> B["API (Node.js)"] --> C[("DB (Postgres)")]';
      expect(repairMermaidSyntax(input)).toBe(expected);
    });

    it('repairs pipe edge labels containing parentheses: -->|Step (1)| -> -->|"Step (1)"|', () => {
      const input = 'flowchart TD\n  A -->|Step (1)| B';
      expect(repairMermaidSyntax(input)).toBe('flowchart TD\n  A -->|"Step (1)"| B');
    });
  });

  describe('detectDiagramType', () => {
    it('detects flowchart and graph', () => {
      expect(detectDiagramType('flowchart TD\n  A --> B')).toBe('Flowchart');
      expect(detectDiagramType('graph LR\n  A --> B')).toBe('Flowchart');
    });

    it('detects sequence diagram', () => {
      expect(detectDiagramType('sequenceDiagram\n  Alice->>Bob: Hello')).toBe('Sequence');
    });

    it('detects class diagram', () => {
      expect(detectDiagramType('classDiagram\n  class Animal')).toBe('Class Diagram');
    });

    it('detects state diagram', () => {
      expect(detectDiagramType('stateDiagram-v2\n  [*] --> Still')).toBe('State Diagram');
    });

    it('detects ER diagram', () => {
      expect(detectDiagramType('erDiagram\n  CUSTOMER ||--o{ ORDER : places')).toBe('ER Diagram');
    });

    it('detects pie chart', () => {
      expect(detectDiagramType('pie title Pets\n  "Dogs" : 386')).toBe('Pie Chart');
    });

    it('detects git graph', () => {
      expect(detectDiagramType('gitGraph\n  commit')).toBe('Git Graph');
    });

    it('detects mindmap', () => {
      expect(detectDiagramType('mindmap\n  root((mindmap))')).toBe('Mindmap');
    });

    it('falls back to Diagram for unrecognized headers', () => {
      expect(detectDiagramType('unknownSyntax\n  something')).toBe('Diagram');
    });
  });

  describe('getDiagramImageFilename', () => {
    it('generates filename for flowchart', () => {
      expect(getDiagramImageFilename('Flowchart')).toBe('mermaid_flowchart.png');
      expect(getDiagramImageFilename('flowchart TD\n  A --> B')).toBe('mermaid_flowchart.png');
    });

    it('generates filename for sequence diagram', () => {
      expect(getDiagramImageFilename('Sequence')).toBe('mermaid_sequence.png');
      expect(getDiagramImageFilename('sequenceDiagram\n  A->>B: msg')).toBe('mermaid_sequence.png');
    });

    it('generates filename for multi-word diagram types', () => {
      expect(getDiagramImageFilename('Class Diagram')).toBe('mermaid_class_diagram.png');
      expect(getDiagramImageFilename('ER Diagram')).toBe('mermaid_er_diagram.png');
      expect(getDiagramImageFilename('Gantt Chart')).toBe('mermaid_gantt_chart.png');
      expect(getDiagramImageFilename('User Journey')).toBe('mermaid_user_journey.png');
      expect(getDiagramImageFilename('C4 Diagram')).toBe('mermaid_c4_diagram.png');
    });

    it('handles empty, undefined, or fallback diagram types', () => {
      expect(getDiagramImageFilename('')).toBe('mermaid_diagram.png');
      expect(getDiagramImageFilename(null as any)).toBe('mermaid_diagram.png');
      expect(getDiagramImageFilename('Diagram')).toBe('mermaid_diagram.png');
    });
  });

  describe('base64ToBlob', () => {
    it('converts base64 PNG data URL to a binary Blob with correct MIME type', () => {
      const blob = base64ToBlob(SAMPLE_PNG_BASE64, 'image/png');
      expect(blob).not.toBeNull();
      expect(blob?.type).toBe('image/png');
      expect(blob?.size).toBeGreaterThan(0);
    });

    it('returns null for empty or invalid inputs', () => {
      expect(base64ToBlob('')).toBeNull();
      expect(base64ToBlob(null as any)).toBeNull();
      expect(base64ToBlob('not-a-base-64-string!@#$')).toBeNull();
    });
  });

  describe('sanitizeSvgForRasterization', () => {
    it('wraps <style> CSS content in CDATA to protect XML serialization', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = '#mermaid-1 .node > rect { fill: #fff; }';
      svg.appendChild(style);

      const sanitized = sanitizeSvgForRasterization(svg, false);
      const sanitizedStyle = sanitized.querySelector('style');
      expect(sanitizedStyle?.textContent).toContain('<![CDATA[');
      expect(sanitizedStyle?.textContent).toContain('#mermaid-1 .node > rect { fill: #fff; }');
      expect(sanitizedStyle?.textContent).toContain(']]>');
    });

    it('converts <foreignObject> elements to SVG <text> elements to prevent canvas tainting', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('x', '20');
      fo.setAttribute('y', '30');
      fo.setAttribute('width', '100');
      fo.setAttribute('height', '40');

      const div = document.createElement('div');
      div.textContent = 'Node Label Text';
      fo.appendChild(div);
      svg.appendChild(fo);

      const sanitized = sanitizeSvgForRasterization(svg, false);
      expect(sanitized.querySelector('foreignObject')).toBeNull();

      const textEl = sanitized.querySelector('text');
      expect(textEl).not.toBeNull();
      expect(textEl?.textContent).toBe('Node Label Text');
      expect(textEl?.getAttribute('text-anchor')).toBe('middle');
      expect(textEl?.getAttribute('dominant-baseline')).toBe('central');
      expect(textEl?.getAttribute('x')).toBe('70'); // 20 + 100/2
      expect(textEl?.getAttribute('y')).toBe('50'); // 30 + 40/2
    });

    it('handles multiline labels inside foreignObject with <tspan> elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('x', '0');
      fo.setAttribute('y', '0');
      fo.setAttribute('width', '100');
      fo.setAttribute('height', '60');

      const div = document.createElement('div');
      div.innerHTML = 'Line One<br>Line Two';
      fo.appendChild(div);
      svg.appendChild(fo);

      const sanitized = sanitizeSvgForRasterization(svg, false);
      const tspans = sanitized.querySelectorAll('text > tspan');
      expect(tspans.length).toBe(2);
      expect(tspans[0].textContent).toBe('Line One');
      expect(tspans[1].textContent).toBe('Line Two');
    });

    it('ensures xmlns and xmlns:xlink attributes are set', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const sanitized = sanitizeSvgForRasterization(svg, false);
      expect(sanitized.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
      expect(sanitized.getAttribute('xmlns:xlink')).toBe('http://www.w3.org/1999/xlink');
    });
  });

  describe('copyImageToClipboard', () => {
    it('copies base64 PNG text to clipboard', async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const success = await copyImageToClipboard(SAMPLE_PNG_BASE64);
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith(SAMPLE_PNG_BASE64);
    });

    it('returns false when base64 string is empty', async () => {
      const success = await copyImageToClipboard('');
      expect(success).toBe(false);
    });

    it('writes binary Blob to clipboard when ClipboardItem is available', async () => {
      const writeMock = jest.fn().mockResolvedValue(undefined);
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      (global as any).ClipboardItem = jest.fn().mockImplementation((items) => items);

      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
          write: writeMock,
        },
      });

      const blob = new Blob(['test-png-binary'], { type: 'image/png' });
      const success = await copyImageToClipboard(SAMPLE_PNG_BASE64, blob);

      expect(success).toBe(true);
      expect(writeMock).toHaveBeenCalled();
    });
  });

  describe('downloadImageData', () => {
    it('creates an anchor element and triggers download with given filename', () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const filename = 'mermaid_flowchart.png';

      const success = downloadImageData(SAMPLE_PNG_BASE64, filename);
      expect(success).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('uses createObjectURL when a Blob is passed or derived', () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const createObjectURLMock = jest.fn().mockReturnValue('blob:http://localhost/mock-uuid');
      const revokeObjectURLMock = jest.fn();
      (window as any).URL.createObjectURL = createObjectURLMock;
      (window as any).URL.revokeObjectURL = revokeObjectURLMock;

      const blob = new Blob(['data'], { type: 'image/png' });
      const success = downloadImageData(SAMPLE_PNG_BASE64, 'mermaid_diagram.png', blob);

      expect(success).toBe(true);
      expect(createObjectURLMock).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('captureViewportImage', () => {
    it('returns null if viewport and container are null', async () => {
      const result = await captureViewportImage({
        viewport: null,
        container: null,
      });
      expect(result).toBeNull();
    });

    it('captures viewport image using svgString fallback when svgEl is not yet mounted in container', async () => {
      const viewport = document.createElement('div');
      const container = document.createElement('div');
      const rawSvgString = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300"><text>Fallback SVG</text></svg>';

      const result = await captureViewportImage({
        viewport,
        container,
        svgString: rawSvgString,
        isDarkMode: false,
      });

      expect(result).not.toBeNull();
      expect(result?.base64Png).toMatch(/^data:image\/png;base64,/);
    });

    it('captures viewport image with complete base64Png and blob, avoiding truncated 100B fallbacks', async () => {
      const viewport = document.createElement('div');
      const container = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 400 300');
      container.appendChild(svg);
      viewport.appendChild(container);

      const result = await captureViewportImage({
        viewport,
        container,
        isDarkMode: false,
      });

      expect(result).not.toBeNull();
      expect(result?.base64Png).toMatch(/^data:image\/png;base64,/);
      // Verify base64Png is not empty or a raw 100-byte slice
      expect(result?.base64Png.length).toBeGreaterThan(100);
      expect(result?.blob).not.toBeNull();
      expect(result?.blob?.type).toBe('image/png');
    });
  });
});

describe('MermaidDiagram Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mermaid.initialize as jest.Mock) = jest.fn();
    (mermaid.render as jest.Mock) = jest.fn().mockImplementation((id: string, text: string) => {
      return Promise.resolve({
        svg: `<svg id="${id}" data-testid="mock-svg" viewBox="0 0 300 150"><text>${text}</text></svg>`,
        bindFunctions: jest.fn(),
      });
    });
    (mermaid.parse as jest.Mock) = jest.fn().mockResolvedValue(true);
  });

  it('renders diagram SVG in visual mode when syntax is valid', async () => {
    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    expect(screen.getByText('Flowchart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Visual$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Code$/i })).toBeInTheDocument();
  });

  it('initializes mermaid with suppressErrorRendering: true', async () => {
    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        suppressErrorRendering: true,
        startOnLoad: false,
      })
    );
  });

  it('automatically repairs unquoted parentheses in node labels and renders successfully', async () => {
    (mermaid.render as jest.Mock) = jest.fn().mockImplementation((id: string, text: string) => {
      if (text.includes('[Some label (xxxx)]')) {
        return Promise.reject(new Error('Syntax error on line 2: unquoted parenthesis'));
      }
      return Promise.resolve({
        svg: `<svg id="${id}" data-testid="mock-repaired-svg"><text>${text}</text></svg>`,
        bindFunctions: jest.fn(),
      });
    });

    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A[Some label (xxxx)] --> B[Done]`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-repaired-svg')).toBeInTheDocument();
    });

    expect(screen.getByText('Auto-Repaired')).toBeInTheDocument();
  });

  it('gracefully handles unrecoverable syntax errors and shows error fallback without dumping to DOM', async () => {
    const onError = jest.fn();
    (mermaid.render as jest.Mock) = jest.fn().mockRejectedValue(
      new Error('Parse error on line 2: Unexpected token')
    );

    render(
      <MermaidDiagram testId="test-mermaid" onError={onError}>
        {`invalid syntax that cannot be auto-repaired`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByText(/Diagram Syntax Error/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Parse error on line 2: Unexpected token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Code/i })).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('toggles to Code mode and allows editing diagram source', async () => {
    const onChange = jest.fn();
    render(
      <MermaidDiagram testId="test-mermaid" onChange={onChange}>
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    // Switch to code mode
    const codeBtn = screen.getByRole('button', { name: /^Code$/i });
    act(() => {
      fireEvent.click(codeBtn);
    });

    // Verify textarea is visible
    const input = screen.getByPlaceholderText(/Enter Mermaid diagram syntax/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('flowchart TD\n  A --> B');

    // Edit code
    act(() => {
      fireEvent.change(input, { target: { value: 'flowchart TD\n  A --> B\n  B --> C' } });
    });
    expect(onChange).toHaveBeenCalledWith('flowchart TD\n  A --> B\n  B --> C');

    // Switch back to visual mode
    const viewBtn = screen.getByRole('button', { name: /View Diagram/i });
    act(() => {
      fireEvent.click(viewBtn);
    });

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        'flowchart TD\n  A --> B\n  B --> C'
      );
    });
  });

  it('clicking "Auto-Fix Labels" in Code mode auto-quotes unquoted parentheses', async () => {
    const onChange = jest.fn();
    render(
      <MermaidDiagram testId="test-mermaid" defaultMode="code" onChange={onChange}>
        {`flowchart TD\n  A[User (Admin)] --> B[DB (Postgres)]`}
      </MermaidDiagram>
    );

    const input = screen.getByPlaceholderText(/Enter Mermaid diagram syntax/i);
    expect(input).toHaveValue('flowchart TD\n  A[User (Admin)] --> B[DB (Postgres)]');

    const autoFixBtn = screen.getByRole('button', { name: /Auto-Fix Labels/i });
    act(() => {
      fireEvent.click(autoFixBtn);
    });

    expect(input).toHaveValue('flowchart TD\n  A["User (Admin)"] --> B["DB (Postgres)"]');
    expect(onChange).toHaveBeenCalledWith('flowchart TD\n  A["User (Admin)"] --> B["DB (Postgres)"]');
  });

  it('resets modified code back to initial value when reset button is clicked', async () => {
    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  Start --> End`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    // Switch to code mode and edit
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Code$/i }));
    });
    const input = screen.getByPlaceholderText(/Enter Mermaid diagram syntax/i);
    act(() => {
      fireEvent.change(input, { target: { value: 'flowchart TD\n  Modified --> State' } });
    });

    // Click reset button in toolbar
    const resetBtn = screen.getByLabelText(/Reset code/i);
    act(() => {
      fireEvent.click(resetBtn);
    });

    expect(input).toHaveValue('flowchart TD\n  Start --> End');
  });

  it('supports copying code to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    const copyBtn = screen.getByLabelText(/Copy Mermaid code/i);
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('flowchart TD\n  A --> B');
  });

  it('provides zoom in, zoom out, and reset zoom controls in visual mode', async () => {
    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    const zoomInBtn = screen.getAllByRole('button', { name: /Zoom in/i })[0];
    const zoomOutBtn = screen.getAllByRole('button', { name: /Zoom out/i })[0];
    const resetBtn = screen.getByRole('button', { name: /Reset zoom and pan$/i });

    expect(zoomInBtn).toBeInTheDocument();
    expect(zoomOutBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    act(() => {
      fireEvent.click(zoomInBtn);
    });
    expect(screen.getByText('125%')).toBeInTheDocument();

    act(() => {
      fireEvent.click(zoomOutBtn);
    });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('opens and closes the full-screen overlay when clicking maximize', async () => {
    render(
      <MermaidDiagram testId="test-mermaid">
        {`flowchart TD\n  A --> B`}
      </MermaidDiagram>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
    });

    const maxBtn = screen.getByRole('button', { name: /Maximize diagram/i });
    expect(maxBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(maxBtn);
    });

    expect(screen.getByText('Mermaid Diagram (Fullscreen)')).toBeInTheDocument();

    const closeFullscreenBtn = screen.getByRole('button', { name: /Close fullscreen/i });
    act(() => {
      fireEvent.click(closeFullscreenBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText('Mermaid Diagram (Fullscreen)')).not.toBeInTheDocument();
    });
  });

  describe('Save Image and Copy Image toolbar actions', () => {
    it('renders "Copy image" and "Save image" buttons in visual mode by default', async () => {
      render(
        <MermaidDiagram testId="test-mermaid">
          {`flowchart TD\n  A --> B`}
        </MermaidDiagram>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Copy image' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save image' })).toBeInTheDocument();
    });

    it('does not render image export buttons when in code mode', async () => {
      render(
        <MermaidDiagram testId="test-mermaid" defaultMode="code">
          {`flowchart TD\n  A --> B`}
        </MermaidDiagram>
      );

      expect(screen.queryByRole('button', { name: 'Copy image' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save image' })).not.toBeInTheDocument();
    });

    it('does not render image export buttons when allowExport={false}', async () => {
      render(
        <MermaidDiagram testId="test-mermaid" allowExport={false}>
          {`flowchart TD\n  A --> B`}
        </MermaidDiagram>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Copy image' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save image' })).not.toBeInTheDocument();
    });

    it('copies base64 encoded PNG to clipboard and triggers onCopyImage callback when clicking "Copy image"', async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const onCopyImage = jest.fn();

      render(
        <MermaidDiagram testId="test-mermaid" onCopyImage={onCopyImage}>
          {`flowchart TD\n  Start --> Finish`}
        </MermaidDiagram>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
      });

      const copyImageBtn = screen.getByRole('button', { name: 'Copy image' });

      await act(async () => {
        fireEvent.click(copyImageBtn);
      });

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/));
      });

      expect(onCopyImage).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/));
    });

    it('triggers file download with filename mermaid_<diagram_type>.png and calls onSaveImage callback', async () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const onSaveImage = jest.fn();

      render(
        <MermaidDiagram testId="test-mermaid" onSaveImage={onSaveImage}>
          {`sequenceDiagram\n  Alice->>Bob: Hello`}
        </MermaidDiagram>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
      });

      const saveImageBtn = screen.getByRole('button', { name: 'Save image' });

      await act(async () => {
        fireEvent.click(saveImageBtn);
      });

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled();
      });

      expect(onSaveImage).toHaveBeenCalledWith('mermaid_sequence.png', expect.stringMatching(/^data:image\/png;base64,/));

      clickSpy.mockRestore();
    });

    it('provides "Copy image" and "Save image" in the fullscreen dialog', async () => {
      render(
        <MermaidDiagram testId="test-mermaid">
          {`flowchart TD\n  A --> B`}
        </MermaidDiagram>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-svg')).toBeInTheDocument();
      });

      // Maximize
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Maximize diagram/i }));
      });

      expect(screen.getByRole('button', { name: 'Copy image (fullscreen)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save image (fullscreen)' })).toBeInTheDocument();
    });
  });
});
