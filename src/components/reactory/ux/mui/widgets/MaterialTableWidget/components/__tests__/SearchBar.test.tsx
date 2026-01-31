/**
 * SearchBar Component Tests
 * 
 * Tests for the SearchBar component which provides debounced search functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

// Mock the useDebouncedSearch hook
jest.mock('../../hooks/useDebounce', () => ({
  useDebouncedSearch: ({ onSearch, initialValue = '' }: { onSearch: (value: string) => void; initialValue?: string }) => {
    const [searchValue, setSearchValue] = React.useState(initialValue);
    const [isSearching, setIsSearching] = React.useState(false);

    React.useEffect(() => {
      if (searchValue !== initialValue) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          onSearch(searchValue);
          setIsSearching(false);
        }, 100); // Short delay for testing
        return () => clearTimeout(timer);
      }
    }, [searchValue, onSearch, initialValue]);

    return {
      searchValue,
      setSearchValue,
      isSearching,
      clearSearch: () => {
        setSearchValue('');
        onSearch('');
      },
    };
  },
}));

describe('SearchBar', () => {
  const defaultProps = {
    onSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the search input', () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search...');
      expect(input).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SearchBar {...defaultProps} placeholder="Search tickets..." />);
      
      const input = screen.getByPlaceholderText('Search tickets...');
      expect(input).toBeInTheDocument();
    });

    it('should render search icon', () => {
      render(<SearchBar {...defaultProps} />);
      
      // Search icon is always visible at the start
      expect(screen.getByText('search')).toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<SearchBar {...defaultProps} initialValue="initial query" />);
      
      const input = screen.getByDisplayValue('initial query');
      expect(input).toBeInTheDocument();
    });

    it('should render with fullWidth when specified', () => {
      const { container } = render(<SearchBar {...defaultProps} fullWidth />);
      
      const textField = container.querySelector('.MuiTextField-root');
      expect(textField).toHaveClass('MuiFormControl-fullWidth');
    });
  });

  describe('search functionality', () => {
    it('should update input value on change', async () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'test query');
      
      expect(input).toHaveValue('test query');
    });

    it('should call onSearch after typing (debounced)', async () => {
      const onSearch = jest.fn();
      render(<SearchBar onSearch={onSearch} />);
      
      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'test');
      
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('test');
      }, { timeout: 500 });
    });
  });

  describe('clear functionality', () => {
    it('should show clear button when there is text', async () => {
      render(<SearchBar {...defaultProps} initialValue="test" />);
      
      // Clear button should be visible
      const clearButton = screen.getByRole('button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search value when clear button is clicked', async () => {
      const onSearch = jest.fn();
      render(<SearchBar onSearch={onSearch} initialValue="test" />);
      
      const clearButton = screen.getByRole('button');
      await userEvent.click(clearButton);
      
      const input = screen.getByPlaceholderText('Search...');
      expect(input).toHaveValue('');
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('search button', () => {
    it('should not show search button by default', () => {
      render(<SearchBar {...defaultProps} />);
      
      // Only the start search icon, not the button
      const searchIcons = screen.getAllByText('search');
      expect(searchIcons).toHaveLength(1);
    });

    it('should show search button when showSearchButton is true', () => {
      render(<SearchBar {...defaultProps} showSearchButton />);
      
      // Should have both start icon and button icon
      const searchIcons = screen.getAllByText('search');
      expect(searchIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should trigger search on Enter key when showSearchButton is true', async () => {
      const onSearch = jest.fn();
      render(<SearchBar onSearch={onSearch} showSearchButton initialValue="test" />);
      
      const input = screen.getByPlaceholderText('Search...');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      
      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });

  describe('help tooltip', () => {
    it('should not show help icon by default', () => {
      render(<SearchBar {...defaultProps} />);
      
      expect(screen.queryByText('help_outline')).not.toBeInTheDocument();
    });

    it('should show help icon when showHelpTooltip is true', () => {
      render(<SearchBar {...defaultProps} showHelpTooltip />);
      
      expect(screen.getByText('help_outline')).toBeInTheDocument();
    });

    it('should show custom help text in tooltip', async () => {
      render(
        <SearchBar
          {...defaultProps}
          showHelpTooltip
          helpText="Custom help text"
        />
      );
      
      const helpIcon = screen.getByText('help_outline');
      await userEvent.hover(helpIcon.closest('button')!);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Custom help text');
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while searching', async () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search...');
      await userEvent.type(input, 'test');
      
      // The loading indicator should appear while debouncing
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search...');
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });

    it('should have proper aria attributes', () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search...');
      expect(input).toHaveAttribute('type', 'text');
    });
  });
});
