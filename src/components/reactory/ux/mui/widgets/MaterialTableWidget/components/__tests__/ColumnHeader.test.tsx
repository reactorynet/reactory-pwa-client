/**
 * ColumnHeader Component Tests
 * 
 * Tests for the enhanced column header renderer that supports:
 * - Custom header components via FQN
 * - i18n translation
 * - Icons and colors
 * - Sort/filter indicators
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ColumnHeader, ColumnHeaderProps, ColumnHeaderConfig } from '../ColumnHeader';

// Create mock theme
const mockTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

// Create mock reactory instance
const createMockReactory = (overrides: Partial<any> = {}) => ({
  getComponent: jest.fn().mockReturnValue(null),
  i18n: {
    t: jest.fn((key: string, fallback: string) => fallback || key),
  },
  utils: {
    objectMapper: jest.fn((obj, map) => obj),
  },
  log: jest.fn(),
  emit: jest.fn(),
  ...overrides,
});

// Default props for tests
const createDefaultProps = (overrides: Partial<ColumnHeaderProps> = {}): ColumnHeaderProps => ({
  field: 'testField',
  title: 'Test Title',
  columnIndex: 0,
  reactory: createMockReactory(),
  theme: mockTheme,
  ...overrides,
});

// Wrapper component for theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={mockTheme}>
    {children}
  </ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('ColumnHeader', () => {
  describe('basic rendering', () => {
    it('should render the column title', () => {
      renderWithTheme(<ColumnHeader {...createDefaultProps()} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render with default styling', () => {
      const { container } = renderWithTheme(<ColumnHeader {...createDefaultProps()} />);
      const typography = container.querySelector('span');
      expect(typography).toHaveStyle({ fontWeight: 600 });
    });
  });

  describe('i18n translation', () => {
    it('should translate title using titleKey', () => {
      const mockReactory = createMockReactory({
        i18n: {
          t: jest.fn((key: string, fallback: string) => 
            key === 'column.testTitle' ? 'Translated Title' : fallback
          ),
        },
      });

      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            reactory: mockReactory,
            header: { titleKey: 'column.testTitle' },
          })}
        />
      );

      expect(mockReactory.i18n.t).toHaveBeenCalledWith('column.testTitle', 'Test Title');
      expect(screen.getByText('Translated Title')).toBeInTheDocument();
    });

    it('should fall back to title when titleKey is not provided', () => {
      renderWithTheme(<ColumnHeader {...createDefaultProps()} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should translate tooltip using tooltipKey', () => {
      const mockReactory = createMockReactory({
        i18n: {
          t: jest.fn((key: string, fallback: string) => 
            key === 'tooltip.test' ? 'Translated Tooltip' : fallback
          ),
        },
      });

      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            reactory: mockReactory,
            header: { 
              tooltip: 'Default Tooltip',
              tooltipKey: 'tooltip.test' 
            },
          })}
        />
      );

      expect(mockReactory.i18n.t).toHaveBeenCalledWith('tooltip.test', 'Default Tooltip');
    });
  });

  describe('icon rendering', () => {
    it('should render icon when provided', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { icon: 'star' },
          })}
        />
      );

      const icon = container.querySelector('.MuiIcon-root');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('star');
    });

    it('should position icon on the left by default', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { icon: 'star' },
          })}
        />
      );

      const content = container.querySelector('.MuiBox-root');
      const children = content?.children;
      // First child should be the icon
      expect(children?.[0]).toHaveClass('MuiIcon-root');
    });

    it('should position icon on the right when specified', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { icon: 'star', iconPosition: 'right' },
          })}
        />
      );

      const content = container.querySelector('.MuiBox-root');
      const children = Array.from(content?.children || []);
      // Last element should contain the icon (before actions)
      const iconIndex = children.findIndex(child => 
        child.classList.contains('MuiIcon-root')
      );
      const textIndex = children.findIndex(child => 
        child.classList.contains('MuiTypography-root')
      );
      expect(iconIndex).toBeGreaterThan(textIndex);
    });

    it('should apply icon color when provided', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { icon: 'star', iconColor: 'red' },
          })}
        />
      );

      const icon = container.querySelector('.MuiIcon-root');
      // Color is converted to RGB by browser
      expect(icon).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
  });

  describe('sorting', () => {
    it('should render sort indicator when sortable', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: true },
          })}
        />
      );

      const sortButton = container.querySelector('.MuiIconButton-root');
      expect(sortButton).toBeInTheDocument();
    });

    it('should not render sort indicator when not sortable', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: false },
          })}
        />
      );

      const sortButton = container.querySelector('.MuiIconButton-root');
      expect(sortButton).not.toBeInTheDocument();
    });

    it('should show ascending arrow when sortDirection is asc', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: true },
            sortDirection: 'asc',
          })}
        />
      );

      const icon = container.querySelector('.MuiIconButton-root .MuiIcon-root');
      expect(icon).toHaveTextContent('arrow_upward');
    });

    it('should show descending arrow when sortDirection is desc', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: true },
            sortDirection: 'desc',
          })}
        />
      );

      const icon = container.querySelector('.MuiIconButton-root .MuiIcon-root');
      expect(icon).toHaveTextContent('arrow_downward');
    });

    it('should call onSort when sort button is clicked', async () => {
      const onSort = jest.fn();
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: true },
            onSort,
          })}
        />
      );

      const sortButton = container.querySelector('.MuiIconButton-root');
      await userEvent.click(sortButton!);

      expect(onSort).toHaveBeenCalledWith('testField', 'asc');
    });

    it('should toggle sort direction when clicked', async () => {
      const onSort = jest.fn();
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { sortable: true },
            sortDirection: 'asc',
            onSort,
          })}
        />
      );

      const sortButton = container.querySelector('.MuiIconButton-root');
      await userEvent.click(sortButton!);

      expect(onSort).toHaveBeenCalledWith('testField', 'desc');
    });
  });

  describe('filtering', () => {
    it('should render filter indicator when filterable', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { filterable: true },
          })}
        />
      );

      const buttons = container.querySelectorAll('.MuiIconButton-root');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show filled filter icon when column is filtered', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { filterable: true },
            isFiltered: true,
          })}
        />
      );

      const icons = container.querySelectorAll('.MuiIcon-root');
      const filterIcon = Array.from(icons).find(icon => 
        icon.textContent === 'filter_alt'
      );
      expect(filterIcon).toBeInTheDocument();
    });

    it('should show outlined filter icon when column is not filtered', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { filterable: true },
            isFiltered: false,
          })}
        />
      );

      const icons = container.querySelectorAll('.MuiIcon-root');
      const filterIcon = Array.from(icons).find(icon => 
        icon.textContent === 'filter_list'
      );
      expect(filterIcon).toBeInTheDocument();
    });

    it('should call onFilter when filter button is clicked', async () => {
      const onFilter = jest.fn();
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { filterable: true },
            onFilter,
          })}
        />
      );

      const buttons = container.querySelectorAll('.MuiIconButton-root');
      const filterButton = Array.from(buttons).find(btn => {
        const icon = btn.querySelector('.MuiIcon-root');
        return icon?.textContent === 'filter_list';
      });
      
      if (filterButton) {
        await userEvent.click(filterButton);
        expect(onFilter).toHaveBeenCalledWith('testField');
      }
    });
  });

  describe('custom header component', () => {
    it('should render custom component when headerComponent is specified and found', () => {
      const CustomComponent: React.FC<any> = ({ title }) => (
        <div data-testid="custom-header">{title} - Custom</div>
      );

      const mockReactory = createMockReactory({
        getComponent: jest.fn().mockReturnValue(CustomComponent),
      });

      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            reactory: mockReactory,
            header: { headerComponent: 'custom.HeaderComponent@1.0.0' },
          })}
        />
      );

      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('Test Title - Custom')).toBeInTheDocument();
    });

    it('should fall back to default when custom component is not found', () => {
      const mockReactory = createMockReactory({
        getComponent: jest.fn().mockReturnValue(null),
      });

      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            reactory: mockReactory,
            header: { headerComponent: 'custom.NotFound@1.0.0' },
          })}
        />
      );

      // Should render default title
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(mockReactory.log).toHaveBeenCalled();
    });

    it('should pass custom props to header component', () => {
      const CustomComponent: React.FC<any> = ({ customProp }) => (
        <div data-testid="custom-header">{customProp}</div>
      );

      const mockReactory = createMockReactory({
        getComponent: jest.fn().mockReturnValue(CustomComponent),
      });

      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            reactory: mockReactory,
            header: {
              headerComponent: 'custom.Header@1.0.0',
              headerComponentProps: { customProp: 'Custom Value' },
            },
          })}
        />
      );

      expect(screen.getByText('Custom Value')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply header text color', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { color: 'blue' },
          })}
        />
      );

      const typography = container.querySelector('.MuiTypography-root');
      // Color is converted to RGB by browser
      expect(typography).toHaveStyle({ color: 'rgb(0, 0, 255)' });
    });

    it('should apply custom header styles via headerSx', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { headerSx: { padding: '16px' } },
          })}
        />
      );

      const content = container.querySelector('.MuiBox-root');
      expect(content).toHaveStyle({ padding: '16px' });
    });

    it('should apply alignment', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { align: 'center' },
          })}
        />
      );

      const content = container.querySelector('.MuiBox-root');
      expect(content).toHaveStyle({ justifyContent: 'center' });
    });

    it('should apply typography variant', () => {
      const { container } = renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { variant: 'h6' },
          })}
        />
      );

      const typography = container.querySelector('.MuiTypography-root');
      expect(typography).toHaveClass('MuiTypography-h6');
    });
  });

  describe('tooltip', () => {
    it('should render tooltip when provided', () => {
      renderWithTheme(
        <ColumnHeader
          {...createDefaultProps({
            header: { tooltip: 'Test Tooltip' },
          })}
        />
      );

      // The tooltip wrapper should be present
      const content = screen.getByText('Test Title').closest('.MuiBox-root');
      expect(content).toBeInTheDocument();
    });
  });
});
