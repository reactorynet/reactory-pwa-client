import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useContentRender, replaceMathSymbols, CodeSnippet } from '../useContentRender';

/**
 * Component mounting used to work by substituting each `<reactory />` tag for a
 * `<div id="...">` placeholder and later portalling into it via
 * getElementById. That only holds for pipelines that emit raw HTML.
 * react-markdown escapes raw HTML, so in a markdown document the placeholder
 * was rendered as the literal text `<div id="...">` and the portal had nothing
 * to attach to — the component simply never appeared.
 *
 * Components are now lifted out of the source before any markup pipeline runs
 * and rendered as real React elements. These tests hold that line for every
 * content format.
 */

const Label: React.FC<any> = ({ text, count, active }) => (
  <span data-testid="label">
    {text}
    {count !== undefined ? `|count:${count}:${typeof count}` : ''}
    {active !== undefined ? `|active:${active}:${typeof active}` : ''}
  </span>
);

const Panel: React.FC<any> = ({ children }) => <section data-testid="panel">{children}</section>;

const registry: Record<string, React.FC<any>> = {
  'core.Label@1.0.0': Label,
  'core.Panel@1.0.0': Panel,
};

const reactoryStub: any = {
  muiTheme: {
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' },
      error: { main: '#d32f2f' },
      warning: { main: '#ed6c02' },
      info: { main: '#0288d1' },
      success: { main: '#2e7d32' },
      text: { secondary: '#666' },
    },
  },
  log: jest.fn(),
  getComponent: (fqn: string) => registry[fqn] || null,
  getComponents: () => ({
    Material: { MaterialCore: {}, MaterialIcons: {}, MaterialLabs: {} },
    // Stands in for react-markdown, which is ESM-only and cannot be imported
    // under this jest transform. Escaping raw HTML the way react-markdown does
    // is the behaviour that matters here.
    Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
    MarkdownGfm: null,
    DOMPurify: { sanitize: (html: string) => html },
    PrismCode: null,
  }),
};

const Host: React.FC<{ content: string }> = ({ content }) => {
  const { renderContent } = useContentRender(reactoryStub);
  return <div data-testid="host">{renderContent(content)}</div>;
};

describe('component mounting through useContentRender', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('markdown content', () => {
    it('mounts a component embedded in a markdown document', () => {
      render(
        <Host content={'# Heading\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Mounted" />\n\nTrailing prose.'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('Mounted');
    });

    it('does not leak the tag as visible text', () => {
      render(
        <Host content={'# Heading\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Mounted" />'} />
      );
      // The original symptom: the placeholder rendered as literal markup.
      expect(screen.getByTestId('host').textContent).not.toContain('<div');
      expect(screen.getByTestId('host').textContent).not.toContain('<reactory');
    });

    it('keeps the surrounding markdown intact', () => {
      render(
        <Host content={'Before text\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="X" />\n\nAfter text'} />
      );
      const host = screen.getByTestId('host').textContent || '';
      expect(host).toContain('Before text');
      expect(host).toContain('After text');
    });

    it('mounts several components in one document', () => {
      render(
        <Host content={'<reactory reactory-component="core.Label@1.0.0" reactory-props-text="one" />\n\nmiddle\n\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="two" />'} />
      );
      const labels = screen.getAllByTestId('label');
      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveTextContent('one');
      expect(labels[1]).toHaveTextContent('two');
    });
  });

  describe('html content', () => {
    it('mounts a component alongside html markup', () => {
      render(
        <Host content={'<p>Some html</p><reactory reactory-component="core.Label@1.0.0" reactory-props-text="FromHtml" />'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('FromHtml');
      expect(screen.getByTestId('host').textContent).toContain('Some html');
    });
  });

  describe('plain text content', () => {
    it('mounts a component in an otherwise plain body', () => {
      render(
        <Host content={'Just words.\n<reactory reactory-component="core.Label@1.0.0" reactory-props-text="FromText" />\nMore words.'} />
      );
      expect(screen.getByTestId('label')).toHaveTextContent('FromText');
    });
  });

  describe('props', () => {
    it('passes typed props through with their types intact', () => {
      render(
        <Host content={'<reactory reactory-component="core.Label@1.0.0" reactory-props-text="t" reactory-props-count="int:7" reactory-props-active="bool:true" />'} />
      );
      const label = screen.getByTestId('label');
      expect(label).toHaveTextContent('count:7:number');
      expect(label).toHaveTextContent('active:true:boolean');
    });

    it('passes the body of a paired tag as children', () => {
      render(<Host content={'<reactory reactory-component="core.Panel@1.0.0">panel body</reactory>'} />);
      expect(screen.getByTestId('panel')).toHaveTextContent('panel body');
    });
  });

  describe('unregistered components', () => {
    it('shows a visible marker rather than a blank space', () => {
      render(<Host content={'<reactory reactory-component="core.DoesNotExist@1.0.0" />'} />);
      expect(screen.getByTestId('host').textContent).toContain('core.DoesNotExist@1.0.0');
    });

    it('logs which component is missing', () => {
      render(<Host content={'<reactory reactory-component="core.DoesNotExist@1.0.0" />'} />);
      expect(reactoryStub.log).toHaveBeenCalledWith(
        expect.stringContaining('core.DoesNotExist@1.0.0'),
        {},
        'warning'
      );
    });
  });

  describe('content without components', () => {
    it('renders normally and mounts nothing', () => {
      render(<Host content={'# Just a heading\n\nAnd a paragraph.'} />);
      expect(screen.queryByTestId('label')).toBeNull();
      expect(screen.getByTestId('host').textContent).toContain('Just a heading');
    });

    it('terminates on content that only looks like a tag', () => {
      // Guards the infinite loop that a shared /g regex caused: a malformed tag
      // rewound the scan and the page hung.
      render(<Host content={'<reactory not-a-real-tag'} />);
      expect(screen.getByTestId('host')).toBeInTheDocument();
    });
  });

  describe('table and math symbol rendering', () => {
    it('renders markdown table cells using the Markdown component', () => {
      const tableMarkdown = `| Service | Layer | Notes |\n| --- | --- | --- |\n| **\`service-a\` (SA)** | Core | Process (pay-in $\\rightarrow$ payout) |`;
      render(<Host content={tableMarkdown} />);
      
      const host = screen.getByTestId('host');
      expect(host.querySelector('table')).not.toBeNull();
      expect(host.querySelectorAll('th')).toHaveLength(3);
      expect(host.querySelectorAll('td')).toHaveLength(3);
      
      // Each cell is rendered through the Markdown component
      const markdownCells = host.querySelectorAll('td [data-testid="markdown"]');
      expect(markdownCells.length).toBe(3);
      // The math symbol $\rightarrow$ is replaced with an arrow →
      expect(host.textContent).toContain('→');
      expect(host.textContent).not.toContain('$\\rightarrow$');
    });

    it('replaces LaTeX arrows and math symbols in standard prose', () => {
      const content = `Flow: step1 $\\rightarrow$ step2 $\\rightarrow$ step3. Also $x \\le 10$ and $y \\ge 5$.`;
      render(<Host content={content} />);
      
      const hostText = screen.getByTestId('host').textContent || '';
      expect(hostText).toContain('Flow: step1 → step2 → step3');
      expect(hostText).toContain('x ≤ 10');
      expect(hostText).toContain('y ≥ 5');
    });

    it('handles standalone un-dollar-escaped latex commands', () => {
      const content = `pay-in \\rightarrow payout`;
      render(<Host content={content} />);
      expect(screen.getByTestId('host').textContent).toContain('pay-in → payout');
    });

    it('preserves code blocks containing latex syntax without replacing', () => {
      expect(replaceMathSymbols('Use `$\\rightarrow$` in markdown')).toBe('Use `$\\rightarrow$` in markdown');
      expect(replaceMathSymbols('Code: `\\rightarrow`')).toBe('Code: `\\rightarrow`');
    });

    it('renders the user table scenario with bold codes and arrow symbols', () => {
      const userTable = [
        '| Service | Sub-Domain / Layer | Responsibility in Relation to RTM & Partners |',
        '| --- | --- | --- |',
        '| **`rewrite-transfer-manager` (RTM)** | Payments Orchestration | Drives the end-to-end transfer lifecycle (pay-in $\\rightarrow$ pricing $\\rightarrow$ fincrime $\\rightarrow$ payout $\\rightarrow$ notify). Requests payout dispatch and handles final delivery confirmation. |',
        '| **`payout-transactor`** | Payout Core | Receives the gRPC `initiatePayout` request from RTM and coordinates routing, treasury reservation, and partner execution. |',
        '| **`payout-partner-manager` (PPM)** | Payout Routing | Evaluates 60+ partner routes using real-time reliability scoring, amount caps, and corridor health to pick the best Payout Partner for the transfer. |',
        '| **`payout-partner-integrator` (PPI)** | Partner Integration | Hosts 60+ Apache Camel integration routes that translate internal gRPC models into external partner-specific REST/SOAP formats. |',
        '| **Payout Partners (60+)** | External Entities | External banks, mobile wallet providers (e.g., M-Pesa, BKash, MTN), cash pickup networks, or crypto rails (Circle/Solana USDC) delivering funds to recipients. |',
      ].join('\n');

      render(<Host content={userTable} />);

      const host = screen.getByTestId('host');
      const text = host.textContent || '';

      // Verify all rows are present
      const rows = host.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);

      // Verify arrows replaced $\rightarrow$
      expect(text).toContain('pay-in → pricing → fincrime → payout → notify');
      expect(text).not.toContain('$\\rightarrow$');
      expect(text).not.toContain('\\rightarrow');
    });

    it('correctly parses tables with escaped pipes', () => {
      const tableWithEscapedPipe = `| Col 1 | Col 2 |\n| --- | --- |\n| a \\| b | c |`;
      render(<Host content={tableWithEscapedPipe} />);
      
      const host = screen.getByTestId('host');
      expect(host.querySelectorAll('td')).toHaveLength(2);
      expect(host.querySelectorAll('td')[0].textContent).toContain('a | b');
    });
  });

  describe('code block rendering and actions', () => {
    it('renders a code block with language label and copy button', () => {
      render(<Host content={'```javascript\nconst a = 1;\n```'} />);
      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
      expect(screen.queryByLabelText('Execute command')).toBeNull();
    });

    it('renders an execute button for shell code blocks', () => {
      render(<Host content={'```shell\ncd directory | command\n```'} />);
      expect(screen.getByText('shell')).toBeInTheDocument();
      expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
      expect(screen.getByLabelText('Execute command')).toBeInTheDocument();
    });

    it('executes shell command via AMQ when execute button is clicked', () => {
      const mockPublish = jest.fn();
      const mockReactory = {
        ...reactoryStub,
        amq: {
          $pub: {
            def: mockPublish,
          },
        },
        emit: jest.fn(),
      };

      const ShellHost: React.FC<{ content: string }> = ({ content }) => {
        const { renderContent } = useContentRender(mockReactory);
        return <div>{renderContent(content)}</div>;
      };

      render(<ShellHost content={'```bash\necho "Hello World"\n```'} />);
      const execBtn = screen.getByLabelText('Execute command');
      fireEvent.click(execBtn);

      expect(mockPublish).toHaveBeenCalledWith('shell.execute', { command: 'echo "Hello World"' }, 'shell');
      expect(mockReactory.emit).toHaveBeenCalledWith('shell.execute', { command: 'echo "Hello World"' });
    });
  });
});
