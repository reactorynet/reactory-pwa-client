import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import mermaid from 'mermaid';
import {
  MermaidDiagram,
  sanitizeMermaidSource,
  repairMermaidSyntax,
  detectDiagramType,
} from '../MermaidDiagram';

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
});

describe('MermaidDiagram Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mermaid.initialize as jest.Mock) = jest.fn();
    (mermaid.render as jest.Mock) = jest.fn().mockImplementation((id: string, text: string) => {
      return Promise.resolve({
        svg: `<svg id="${id}" data-testid="mock-svg"><text>${text}</text></svg>`,
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
    // When primary unquoted syntax fails in mermaid, the auto-repair should quote it and retry
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
});
