/**
 * LabelWidgetV2 Unit Tests
 * 
 * Tests for the refactored LabelWidget component.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock the useReactory hook
const mockReactory = {
  log: jest.fn(),
  createNotification: jest.fn(),
  graphqlQuery: jest.fn(),
  utils: {
    objectMapper: jest.fn((src, map) => ({})),
  },
  getComponent: jest.fn(),
  componentRegister: {},
  $func: {},
};

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactory,
}));

// Mock the DynamicWidget component
jest.mock('../../DynamicWidget', () => ({
  DynamicWidget: ({ uiSchema }: any) => (
    <div data-testid="dynamic-widget">
      DynamicWidget: {uiSchema?.['ui:options']?.componentFqn}
    </div>
  ),
}));

// Import after mocks are set up
import { LabelWidget } from '../LabelWidgetV2';
import type { LabelWidgetProps } from '../types';

// Test theme
const theme = createTheme();

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Default props factory
// Note: formContext is not provided since it's optional and tests don't need full context
const createProps = (overrides: Partial<LabelWidgetProps> = {}): LabelWidgetProps => ({
  formData: 'Test Value',
  schema: { type: 'string' },
  uiSchema: {},
  idSchema: { $id: 'test-label' },
  ...overrides,
} as LabelWidgetProps);

describe('LabelWidgetV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<LabelWidget {...createProps()} />);
      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });

    it('renders with formData as string', () => {
      renderWithTheme(<LabelWidget {...createProps({ formData: 'Hello World' })} />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders with formData as number', () => {
      renderWithTheme(<LabelWidget {...createProps({ formData: 42 })} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders emptyText when formData is null', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: null,
            uiSchema: { 'ui:options': { emptyText: 'No data' } },
          })}
        />
      );
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('renders default emptyText when formData is undefined', () => {
      renderWithTheme(
        <LabelWidget {...createProps({ formData: undefined })} />
      );
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = renderWithTheme(
        <LabelWidget {...createProps({ className: 'my-custom-class' })} />
      );
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });

    it('renders with id from idSchema', () => {
      const { container } = renderWithTheme(
        <LabelWidget {...createProps({ idSchema: { $id: 'my-label-id' } })} />
      );
      expect(container.querySelector('#my-label-id')).toBeInTheDocument();
    });
  });

  describe('Text Formatting', () => {
    it('formats text using lodash template', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: { name: 'John' },
            uiSchema: {
              'ui:options': {
                format: 'Hello, ${formData.name}!',
              },
            },
          })}
        />
      );
      expect(screen.getByText('Hello, John!')).toBeInTheDocument();
    });

    it('handles template errors gracefully', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: null,
            uiSchema: {
              'ui:options': {
                format: '${formData.nonexistent.deep}',
              },
            },
          })}
        />
      );
      // Should show template error message
      expect(screen.getByText(/Template Error/)).toBeInTheDocument();
    });

    it('uses custom $format function', () => {
      mockReactory.$func = {
        myFormatter: jest.fn(() => 'Custom Formatted'),
      };

      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: 'test',
            uiSchema: {
              'ui:options': {
                $format: 'myFormatter',
              },
            },
          })}
        />
      );
      expect(screen.getByText('Custom Formatted')).toBeInTheDocument();
    });
  });

  describe('Boolean Display', () => {
    it('renders boolean true with yesLabel', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: true,
            schema: { type: 'boolean' },
            uiSchema: {
              'ui:options': {
                yesLabel: 'Active',
                noLabel: 'Inactive',
              },
            },
          })}
        />
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders boolean false with noLabel', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: false,
            schema: { type: 'boolean' },
            uiSchema: {
              'ui:options': {
                yesLabel: 'Active',
                noLabel: 'Inactive',
              },
            },
          })}
        />
      );
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders boolean with custom icons', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: true,
            schema: { type: 'boolean' },
            uiSchema: {
              'ui:options': {
                yesIcon: 'check_circle',
                noIcon: 'cancel',
              },
            },
          })}
        />
      );
      // Icon should be rendered
      expect(container.querySelector('.MuiIcon-root')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('renders icon on the left position', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                icon: 'star',
                iconPosition: 'left' as const,
              },
            },
          })}
        />
      );
      const icon = container.querySelector('.MuiIcon-root');
      expect(icon).toBeInTheDocument();
      expect(icon?.textContent).toBe('star');
    });

    it('renders icon on the right position', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                icon: 'arrow_forward',
                iconPosition: 'right' as const,
              },
            },
          })}
        />
      );
      const icon = container.querySelector('.MuiIcon-root');
      expect(icon).toBeInTheDocument();
    });

    it('renders icon inline with text', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                icon: 'info',
                iconPosition: 'inline' as const,
              },
            },
          })}
        />
      );
      // Should be rendered within a flex container
      expect(container.querySelector('.MuiIcon-root')).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('shows copy button when copyToClipboard is true', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                copyToClipboard: true,
              },
            },
          })}
        />
      );
      expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument();
    });

    it('does not show copy button when copyToClipboard is false', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                copyToClipboard: false,
              },
            },
          })}
        />
      );
      expect(screen.queryByRole('button', { name: /copy to clipboard/i })).not.toBeInTheDocument();
    });

    it('calls clipboard API on copy button click', async () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: 'Copy Me',
            uiSchema: {
              'ui:options': {
                copyToClipboard: true,
              },
            },
          })}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Copy Me');
      });
    });

    it('shows notification after successful copy', async () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: 'Copy Me',
            uiSchema: {
              'ui:options': {
                copyToClipboard: true,
              },
            },
          })}
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockReactory.createNotification).toHaveBeenCalledWith(
          'Copied To Clipboard!',
          expect.objectContaining({
            showInAppNotification: true,
            type: 'success',
          })
        );
      });
    });
  });

  describe('Styling', () => {
    it('applies legacy containerProps.style', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                containerProps: {
                  style: { backgroundColor: 'red' },
                },
              },
            },
          })}
        />
      );
      const labelContainer = container.querySelector('.reactory-label-widget-container');
      expect(labelContainer).toHaveStyle({ backgroundColor: 'red' });
    });

    it('applies modern containerSx', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                containerSx: { p: 2 },
              },
            },
          })}
        />
      );
      const labelContainer = container.querySelector('.reactory-label-widget-container');
      expect(labelContainer).toBeInTheDocument();
    });
  });

  describe('Dynamic Component (componentFqn)', () => {
    it('delegates to DynamicWidget when componentFqn is set', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                componentFqn: 'core.CustomComponent@1.0.0',
              },
            },
          })}
        />
      );
      expect(screen.getByTestId('dynamic-widget')).toBeInTheDocument();
      expect(screen.getByText(/core.CustomComponent@1.0.0/)).toBeInTheDocument();
    });

    it('passes componentProps to DynamicWidget', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                componentFqn: 'core.CustomComponent@1.0.0',
                componentProps: { variant: 'outlined' },
              },
            },
          })}
        />
      );
      expect(screen.getByTestId('dynamic-widget')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="text" attribute', () => {
      const { container } = renderWithTheme(
        <LabelWidget {...createProps()} />
      );
      expect(container.querySelector('[role="text"]')).toBeInTheDocument();
    });

    it('has aria-label with label text', () => {
      const { container } = renderWithTheme(
        <LabelWidget {...createProps({ formData: 'Accessible Label' })} />
      );
      expect(container.querySelector('[aria-label="Accessible Label"]')).toBeInTheDocument();
    });
  });

  describe('Typography Variants', () => {
    it('renders with h6 variant', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                variant: 'h6' as const,
              },
            },
          })}
        />
      );
      expect(container.querySelector('.MuiTypography-h6')).toBeInTheDocument();
    });

    it('renders with body2 variant', () => {
      const { container } = renderWithTheme(
        <LabelWidget
          {...createProps({
            uiSchema: {
              'ui:options': {
                variant: 'body2' as const,
              },
            },
          })}
        />
      );
      expect(container.querySelector('.MuiTypography-body2')).toBeInTheDocument();
    });
  });

  describe('HTML Rendering', () => {
    it('renders HTML when renderHtml is true', () => {
      renderWithTheme(
        <LabelWidget
          {...createProps({
            formData: '<strong>Bold Text</strong>',
            uiSchema: {
              'ui:options': {
                renderHtml: true,
              },
            },
          })}
        />
      );
      expect(screen.getByText('Bold Text')).toBeInTheDocument();
    });
  });
});
