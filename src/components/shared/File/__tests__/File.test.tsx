import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import File from '../File';
import { useReactory } from '@reactory/client-core/api';
import useFileSession from '../hooks/useFileSession';
import { useContentRender } from '../../hooks/useContentRender';

jest.mock('@reactory/client-core/api', () => ({
  useReactory: jest.fn(),
}));

jest.mock('../hooks/useFileSession', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../hooks/useSaveShortcut', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useContentRender', () => ({
  __esModule: true,
  useContentRender: jest.fn(),
}));

jest.mock('@reactory/client-core/components/reactory/ux/mui/widgets/RichEditor', () => ({
  __esModule: true,
  default: ({ formData, readonly }: any) => (
    <div data-testid="mock-rich-editor" data-readonly={String(readonly)}>
      {formData}
    </div>
  ),
}));

describe('<File />', () => {
  const mockReactory = {
    getComponents: jest.fn().mockReturnValue({}),
    muiTheme: {
      palette: {
        mode: 'light',
        divider: '#e0e0e0',
        warning: { main: '#ed6c02', light: '#ffb74d', contrastText: '#fff' },
      },
    },
  };

  const defaultSession = {
    content: '# Hello World\nThis is markdown',
    setContent: jest.fn(),
    dirty: false,
    baseRevision: 'rev-1',
    sessionId: 'session-1',
    connectionState: 'connected',
    conflict: null,
    readOnlyReason: null,
    readOnlyMessage: null,
    loading: false,
    mimetype: 'text/markdown',
    save: jest.fn(),
    reload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useReactory as jest.Mock).mockReturnValue(mockReactory);
    (useFileSession as jest.Mock).mockReturnValue({ ...defaultSession });
    (useContentRender as jest.Mock).mockReturnValue({
      renderContent: (content: string) => (
        <div data-testid="mock-preview-rendered">{content}</div>
      ),
      detectContentType: jest.fn().mockReturnValue('text/markdown'),
    });
  });

  it('renders markdown files in preview mode by default and displays the toggle', () => {
    render(<File path="/docs/specification.md" scope="user" />);

    // Should render preview toggle buttons
    const previewBtn = screen.getByRole('button', { name: /preview/i });
    const rawBtn = screen.getByRole('button', { name: /raw/i });
    expect(previewBtn).toBeInTheDocument();
    expect(rawBtn).toBeInTheDocument();

    // Preview button is selected by default
    expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
    expect(rawBtn).toHaveAttribute('aria-pressed', 'false');

    // Should render preview content via useContentRender
    expect(screen.getByTestId('file-preview-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-preview-rendered')).toHaveTextContent('Hello World');

    // RichEditor should not be visible in preview mode
    expect(screen.queryByTestId('mock-rich-editor')).not.toBeInTheDocument();
  });

  it('toggles from preview to raw mode and back when clicking toggle buttons', () => {
    render(<File path="/docs/specification.md" scope="user" />);

    const rawBtn = screen.getByRole('button', { name: /raw/i });
    fireEvent.click(rawBtn);

    // Now raw mode is active
    expect(rawBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('mock-rich-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('file-preview-content')).not.toBeInTheDocument();

    // Toggle back to preview
    const previewBtn = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);
    expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('file-preview-content')).toBeInTheDocument();
  });

  it('detects html files as previewable and defaults to preview', () => {
    (useFileSession as jest.Mock).mockReturnValue({
      ...defaultSession,
      content: '<h1>Title</h1>',
      mimetype: 'text/html',
    });

    render(<File path="/public/index.html" scope="user" />);

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByTestId('file-preview-content')).toBeInTheDocument();
  });

  it('detects text files as previewable and defaults to preview', () => {
    (useFileSession as jest.Mock).mockReturnValue({
      ...defaultSession,
      content: 'Plain text note',
      mimetype: 'text/plain',
    });

    render(<File path="/notes/memo.txt" scope="user" />);

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByTestId('file-preview-content')).toBeInTheDocument();
  });

  it('does not display preview toggle for non-previewable files and renders raw editor directly', () => {
    (useFileSession as jest.Mock).mockReturnValue({
      ...defaultSession,
      content: '',
      mimetype: 'application/octet-stream',
    });

    render(<File path="/assets/archive.bin" mimetype="application/octet-stream" scope="user" />);

    // No toggle button group
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /raw/i })).not.toBeInTheDocument();

    // Editor is rendered
    expect(screen.getByTestId('mock-rich-editor')).toBeInTheDocument();
  });

  it('shows loading indicator when session is loading in preview mode', () => {
    (useFileSession as jest.Mock).mockReturnValue({
      ...defaultSession,
      content: '',
      loading: true,
    });

    render(<File path="/docs/specification.md" scope="user" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
