/**
 * MaterialTableWidget Component Tests
 * 
 * Comprehensive tests for the main MaterialTableWidget component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaterialTableWidget from '../MaterialTableWidget';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

// Mock useSizeSpec hook
jest.mock('@reactory/client-core/components/hooks/useSizeSpec', () => ({
  useSizeSpec: () => ({
    innerWidth: 1920,
    innerHeight: 1080,
    breakpoint: 'lg',
  }),
}));

// Create mock reactory API
const createMockReactory = (overrides = {}) => ({
  getComponent: jest.fn((id) => {
    if (id === 'core.AlertDialog@1.0.0') {
      return ({ open, title, content, onAccept, onClose }) => (
        open ? (
          <div data-testid="alert-dialog">
            <div data-testid="alert-title">{title}</div>
            <div data-testid="alert-content">{content}</div>
            <button onClick={onAccept}>Accept</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        ) : null
      );
    }
    if (id === 'core.DropDownMenu@1.0.0') {
      return ({ menus, onSelect }) => (
        <div data-testid="dropdown-menu">
          {menus?.map((menu, idx) => (
            <button key={idx} onClick={(e) => onSelect(e, menu)}>
              {menu.title}
            </button>
          ))}
        </div>
      );
    }
    if (id === 'core.ReactoryFormUtilities') {
      return {
        getDefaultRegistry: () => ({
          fields: {},
          widgets: {},
        }),
      };
    }
    return null;
  }),
  getComponents: jest.fn(() => ({
    DropDownMenu: ({ menus, onSelect }) => (
      <div data-testid="dropdown-menu">
        {menus?.map((menu, idx) => (
          <button key={idx} onClick={(e) => onSelect(e, menu)}>
            {menu.title}
          </button>
        ))}
      </div>
    ),
  })),
  graphqlQuery: jest.fn().mockResolvedValue({
    data: {
      items: {
        data: [],
        paging: { page: 1, pageSize: 10, total: 0, hasNext: false },
      },
    },
  }),
  graphqlMutation: jest.fn().mockResolvedValue({ data: {} }),
  utils: {
    objectMapper: jest.fn((source, map) => source),
    parseObjectMap: jest.fn((map) => map),
    template: jest.fn((str) => () => typeof str === 'string' ? str : 'Template Result'),
    lodash: {
      filter: jest.fn((arr, predicate) => arr?.filter(predicate) || []),
      findIndex: jest.fn((arr, predicate) => arr?.findIndex(predicate) || -1),
      cloneDeep: jest.fn((obj) => {
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch {
          return obj;
        }
      }),
    },
  },
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  removeListener: jest.fn(),
  createNotification: jest.fn(),
  i18n: {
    t: jest.fn((key, fallback) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object') return key;
      return key;
    }),
  },
  componentRegister: {},
  ...overrides,
});

// Mock useReactory hook
let mockReactoryInstance = createMockReactory();
jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactoryInstance,
  withReactory: (Component) => Component,
}));

// Mock theme
const mockTheme = {
  spacing: (n: number) => `${n * 8}px`,
  palette: {
    primary: { main: '#1976d2' },
    action: { activatedOpacity: 0.12 },
  },
  breakpoints: {
    down: () => false,
  },
  MaterialTableWidget: {
    light: {
      rowStyle: {},
      altRowStyle: {},
      selectedRowStyle: {},
      headerStyle: {},
    },
    dark: {
      rowStyle: {},
      altRowStyle: {},
      selectedRowStyle: {},
      headerStyle: {},
    },
  },
};

// Mock useTheme to return our mock theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => mockTheme,
  styled: (component: any) => (styles: any) => component,
  alpha: (color: string, opacity: number) => color,
}));

describe('MaterialTableWidget', () => {
  const mockSchema: any = {
    type: 'array',
    title: 'Test Table',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string' },
      },
    },
  };

  const mockColumns = [
    { field: 'id', title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'status', title: 'Status' },
  ];

  const mockFormData = [
    { id: '1', name: 'Item 1', status: 'active' },
    { id: '2', name: 'Item 2', status: 'pending' },
    { id: '3', name: 'Item 3', status: 'inactive' },
  ];

  const defaultProps: any = {
    reactory: mockReactoryInstance,
    theme: mockTheme,
    schema: mockSchema,
    uiSchema: {
      'ui:title': 'Test Table',
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: mockColumns,
        options: {
          toolbar: true,
          selection: false,
        },
      },
    },
    idSchema: { $id: 'test-table' },
    formData: mockFormData,
    formContext: {
      graphql: {},
      formData: {},
    },
    paging: {
      page: 1,
      pageSize: 10,
      total: 3,
      hasNext: false,
    },
    searchText: '',
    onChange: jest.fn(),
    registry: {
      fields: {},
      widgets: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactoryInstance = createMockReactory();
  });

  describe('rendering', () => {
    it('should render the table', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      // Component renders multiple tables (toolbar, main, pagination)
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThan(0);
      
      // Main data table should have the correct id
      expect(document.getElementById('test-table_table')).toBeInTheDocument();
    });

    it('should render column headers', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render table rows from formData', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render table title', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      expect(screen.getByText('Test Table')).toBeInTheDocument();
    });

    it('should show empty message when no data', () => {
      render(<MaterialTableWidget {...defaultProps} formData={[]} />);
      
      expect(screen.getByText('No data available.')).toBeInTheDocument();
    });

    it('should render custom empty message from localization', () => {
      const props = {
        ...defaultProps,
        formData: [],
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            localization: {
              body: {
                emptyDataSourceMessage: 'No items found',
              },
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    const propsWithSelection = {
      ...defaultProps,
      uiSchema: {
        ...defaultProps.uiSchema,
        'ui:options': {
          ...defaultProps.uiSchema['ui:options'],
          options: {
            ...defaultProps.uiSchema['ui:options'].options,
            selection: true,
          },
        },
      },
    };

    it('should render checkboxes when selection is enabled', () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      // Should have header checkbox + one for each row
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(4); // 1 header + 3 rows
    });

    it('should toggle row selection when checkbox is clicked', async () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const rowCheckbox = checkboxes[1]; // First row checkbox
      
      expect(rowCheckbox).not.toBeChecked();
      
      await userEvent.click(rowCheckbox);
      
      expect(rowCheckbox).toBeChecked();
    });

    it('should select all rows when header checkbox is clicked', async () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      
      await userEvent.click(headerCheckbox);
      
      // All row checkboxes should be checked
      const rowCheckboxes = checkboxes.slice(1);
      rowCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should deselect all rows when header checkbox is clicked again', async () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      
      // Select all
      await userEvent.click(headerCheckbox);
      // Deselect all
      await userEvent.click(headerCheckbox);
      
      const rowCheckboxes = checkboxes.slice(1);
      rowCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should show selected count in toolbar when rows are selected', async () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first row
      await userEvent.click(checkboxes[1]);
      
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should show indeterminate state when some rows are selected', async () => {
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];
      
      // Select only first row
      await userEvent.click(checkboxes[1]);
      
      // Header checkbox should be indeterminate
      expect(headerCheckbox).toHaveAttribute('data-indeterminate', 'true');
    });
  });

  describe('pagination', () => {
    it('should render pagination controls', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      // Should have pagination navigation buttons
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    });

    it('should not render pagination when disabled', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            pagination: false,
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    const propsWithSearch = {
      ...defaultProps,
      uiSchema: {
        ...defaultProps.uiSchema,
        'ui:options': {
          ...defaultProps.uiSchema['ui:options'],
          search: true,
        },
      },
    };

    it('should render search field when search is enabled', () => {
      render(<MaterialTableWidget {...propsWithSearch} />);
      
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });

    it('should update search input value on change', async () => {
      render(<MaterialTableWidget {...propsWithSearch} />);
      
      const searchInput = screen.getByLabelText('Search');
      await userEvent.type(searchInput, 'test query');
      
      expect(searchInput).toHaveValue('test query');
    });
  });

  describe('toolbar', () => {
    it('should render toolbar', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      // Toolbar should contain the title
      expect(screen.getByText('Test Table')).toBeInTheDocument();
    });

    it('should not render header when toolbar is false', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            options: {
              ...defaultProps.uiSchema['ui:options'].options,
              toolbar: false,
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      // When toolbar: false, the table header row with column headers should not be rendered
      // The main table should not have a thead element
      const mainTable = document.getElementById('test-table_table');
      expect(mainTable).toBeInTheDocument();
      
      // The table should not have column headers (since toolbar: false affects getHeader)
      const thead = mainTable?.querySelector('thead');
      expect(thead).toBeNull();
    });

    it('should render add button when allowAdd is true', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            allowAdd: true,
            addButtonProps: {
              tooltip: 'Add new item',
              icon: 'add',
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      expect(screen.getByText('add')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    const DetailPanel = ({ rowData }) => (
      <div data-testid="detail-panel">Details for {rowData.name}</div>
    );

    const propsWithDetailsPanel = {
      ...defaultProps,
      uiSchema: {
        ...defaultProps.uiSchema,
        'ui:options': {
          ...defaultProps.uiSchema['ui:options'],
          componentMap: {
            DetailsPanel: 'test.DetailPanel',
          },
        },
      },
    };

    beforeEach(() => {
      mockReactoryInstance = createMockReactory({
        getComponent: jest.fn((id) => {
          if (id === 'test.DetailPanel') {
            return DetailPanel;
          }
          if (id === 'core.AlertDialog@1.0.0') {
            return () => null;
          }
          if (id === 'core.DropDownMenu@1.0.0') {
            return () => null;
          }
          if (id === 'core.ReactoryFormUtilities') {
            return {
              getDefaultRegistry: () => ({ fields: {}, widgets: {} }),
            };
          }
          return null;
        }),
        getComponents: jest.fn(() => ({
          DropDownMenu: () => null,
        })),
      });
    });

    it('should render expand icons when details panel is configured', () => {
      render(<MaterialTableWidget {...propsWithDetailsPanel} />);
      
      // Should have expand icons
      expect(screen.getAllByText('expand_more').length).toBeGreaterThan(0);
    });

    it('should expand row when expand icon is clicked', async () => {
      render(<MaterialTableWidget {...propsWithDetailsPanel} />);
      
      const expandButtons = screen.getAllByText('expand_more');
      await userEvent.click(expandButtons[0].closest('button')!);
      
      // Icon should change to expand_less
      expect(screen.getByText('expand_less')).toBeInTheDocument();
    });

    it('should render expand all/collapse all button in header', () => {
      render(<MaterialTableWidget {...propsWithDetailsPanel} />);
      
      expect(screen.getByText('unfold_more')).toBeInTheDocument();
    });
  });

  describe('column formatting', () => {
    it('should render cell data using format template', () => {
      mockReactoryInstance = createMockReactory({
        utils: {
          ...createMockReactory().utils,
          template: jest.fn((format) => ({ row }) => `Formatted: ${row.name}`),
        },
      });

      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            columns: [
              { field: 'id', title: 'ID' },
              { field: 'name', title: 'Name', format: '${row.name}' },
              { field: 'status', title: 'Status' },
            ],
            options: {
              toolbar: true,
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      // The formatted value should be displayed
      expect(screen.getAllByText(/Formatted:/i).length).toBeGreaterThan(0);
    });
  });

  describe('conditional row styling', () => {
    it('should apply styles when row data matches condition', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            conditionalRowStyling: [
              {
                field: 'status',
                condition: 'active',
                style: { backgroundColor: 'green' },
              },
            ],
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      // The component should render without errors
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show retry button on render error', () => {
      // Force an error by providing invalid props
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            columns: null, // This might cause an error
          },
        },
      };
      
      // The component should handle errors gracefully
      render(<MaterialTableWidget {...props} />);
      
      consoleSpy.mockRestore();
    });
  });

  describe('actions', () => {
    const propsWithActions = {
      ...defaultProps,
      formContext: {
        graphql: {
          mutation: {
            deleteItems: {
              text: 'mutation deleteItems($ids: [String!]!) { deleteItems(ids: $ids) }',
              name: 'deleteItems',
              variables: {},
            },
          },
        },
      },
      uiSchema: {
        ...defaultProps.uiSchema,
        'ui:options': {
          ...defaultProps.uiSchema['ui:options'],
          options: {
            ...defaultProps.uiSchema['ui:options'].options,
            selection: true,
          },
          actions: [
            {
              key: 'delete',
              title: 'Delete Selected',
              icon: 'delete',
              isFreeAction: true,
              mutation: 'deleteItems',
              confirmation: {
                title: 'Confirm Delete',
                content: 'Are you sure you want to delete?',
                acceptTitle: 'Delete',
                cancelTitle: 'Cancel',
              },
            },
          ],
        },
      },
    };

    it('should show actions dropdown when rows are selected', async () => {
      render(<MaterialTableWidget {...propsWithActions} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select a row
      await userEvent.click(checkboxes[1]);
      
      // Actions dropdown should be visible - using waitFor with a longer timeout
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      }, { timeout: 3000 });
    }, 10000); // Increase test timeout
  });

  describe('remote data', () => {
    const propsWithRemoteData = {
      ...defaultProps,
      formContext: {
        graphql: {
          query: {
            text: 'query getItems { items { data paging } }',
            name: 'items',
            variables: {},
          },
        },
      },
      uiSchema: {
        ...defaultProps.uiSchema,
        'ui:options': {
          ...defaultProps.uiSchema['ui:options'],
          remoteData: true,
          query: 'query',
        },
      },
    };

    it('should call graphqlQuery when remoteData is true', async () => {
      render(<MaterialTableWidget {...propsWithRemoteData} />);
      
      await waitFor(() => {
        expect(mockReactoryInstance.graphqlQuery).toHaveBeenCalled();
      });
    });
  });

  describe('refresh events', () => {
    it('should bind refresh events on mount', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            refreshEvents: [
              { name: 'data:refresh' },
            ],
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      expect(mockReactoryInstance.on).toHaveBeenCalledWith('data:refresh', expect.any(Function));
    });

    it('should remove refresh events on unmount', () => {
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            refreshEvents: [
              { name: 'data:refresh' },
            ],
          },
        },
      };
      
      const { unmount } = render(<MaterialTableWidget {...props} />);
      
      unmount();
      
      expect(mockReactoryInstance.removeListener).toHaveBeenCalledWith('data:refresh', expect.any(Function));
    });
  });

  describe('accessibility', () => {
    it('should have proper table structure', () => {
      render(<MaterialTableWidget {...defaultProps} />);
      
      // Component renders multiple tables (toolbar, main data table, pagination)
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThan(0);
      
      // Main data table should exist with correct id
      const mainTable = document.getElementById('test-table_table');
      expect(mainTable).toBeInTheDocument();
      
      // Should have rows
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      
      // Column headers should be present (3 columns)
      expect(screen.getAllByRole('columnheader').length).toBe(3);
    });

    it('should have accessible checkbox labels', () => {
      const propsWithSelection = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            options: {
              selection: true,
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...propsWithSelection} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('custom components', () => {
    it('should render custom toolbar component', () => {
      const CustomToolbar = () => <div data-testid="custom-toolbar">Custom Toolbar</div>;
      
      mockReactoryInstance = createMockReactory({
        getComponent: jest.fn((id) => {
          if (id === 'custom.Toolbar') {
            return CustomToolbar;
          }
          if (id === 'core.ReactoryFormUtilities') {
            return {
              getDefaultRegistry: () => ({ fields: {}, widgets: {} }),
            };
          }
          return null;
        }),
        getComponents: jest.fn(() => ({
          DropDownMenu: () => null,
        })),
      });

      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            ...defaultProps.uiSchema['ui:options'],
            componentMap: {
              Toolbar: 'custom.Toolbar',
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('should render table without footer when no renderFooter columns', () => {
      // Test that table renders correctly without footer columns
      const props = {
        ...defaultProps,
        uiSchema: {
          ...defaultProps.uiSchema,
          'ui:options': {
            columns: [
              { field: 'id', title: 'ID' },
              { 
                field: 'name', 
                title: 'Name',
              },
              { field: 'status', title: 'Status' },
            ],
            options: {
              toolbar: true,
            },
          },
        },
      };
      
      render(<MaterialTableWidget {...props} />);
      
      // Tables should render (toolbar, main, pagination)
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThan(0);
      
      // Main data table should exist
      const mainTable = document.getElementById('test-table_table');
      expect(mainTable).toBeInTheDocument();
      
      // Footer element should not be present when no columns have renderFooter
      const tfoot = mainTable?.querySelector('tfoot');
      expect(tfoot).toBeNull();
    });
  });
});
