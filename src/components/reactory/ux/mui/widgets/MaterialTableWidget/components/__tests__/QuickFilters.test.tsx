/**
 * QuickFilters Component Tests
 * 
 * Tests for the QuickFilters component which provides quick filter buttons/chips
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickFilters, QuickFiltersProps } from '../QuickFilters';
import { QuickFilterDefinition } from '../../hooks/useQuickFilters';

// Mock the useQuickFilters hook
const mockToggleFilter = jest.fn();
const mockClearFilters = jest.fn();
const mockIsActive = jest.fn();
let mockActiveFilters: string[] = [];

jest.mock('../../hooks/useQuickFilters', () => ({
  useQuickFilters: ({ onFilterChange }: { onFilterChange: (filters: string[]) => void }) => {
    return {
      activeFilters: mockActiveFilters,
      toggleFilter: (id: string) => {
        mockToggleFilter(id);
        // Simulate toggle behavior
        if (mockActiveFilters.includes(id)) {
          mockActiveFilters = mockActiveFilters.filter(f => f !== id);
        } else {
          mockActiveFilters = [...mockActiveFilters, id];
        }
        onFilterChange(mockActiveFilters);
      },
      clearFilters: () => {
        mockClearFilters();
        mockActiveFilters = [];
        onFilterChange([]);
      },
      isActive: (id: string) => mockActiveFilters.includes(id),
    };
  },
}));

describe('QuickFilters', () => {
  const mockFilters: QuickFilterDefinition[] = [
    {
      id: 'active',
      label: 'Active',
      filter: {
        field: 'status',
        operator: 'eq',
        value: 'active',
      },
    },
    {
      id: 'pending',
      label: 'Pending',
      icon: 'pending',
      filter: {
        field: 'status',
        operator: 'eq',
        value: 'pending',
      },
    },
    {
      id: 'urgent',
      label: 'Urgent',
      color: 'error',
      badge: 5,
      filter: {
        field: 'priority',
        operator: 'eq',
        value: 'high',
      },
    },
  ];

  const defaultProps: QuickFiltersProps = {
    filters: mockFilters,
    onFilterChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveFilters = [];
  });

  describe('buttons variant (default)', () => {
    it('should render all filter buttons', () => {
      render(<QuickFilters {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Urgent/i })).toBeInTheDocument();
    });

    it('should render buttons with icons', () => {
      render(<QuickFilters {...defaultProps} />);
      
      expect(screen.getByText('pending')).toBeInTheDocument(); // Icon text
    });

    it('should call toggleFilter when button is clicked', async () => {
      render(<QuickFilters {...defaultProps} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      await userEvent.click(activeButton);
      
      expect(mockToggleFilter).toHaveBeenCalledWith('active');
    });

    it('should show outlined variant for inactive buttons', () => {
      render(<QuickFilters {...defaultProps} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveClass('MuiButton-outlined');
    });

    it('should show contained variant for active buttons', () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toHaveClass('MuiButton-contained');
    });

    it('should render badge when filter has badge value', () => {
      render(<QuickFilters {...defaultProps} />);
      
      // Badge should display the count
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('chips variant', () => {
    it('should render all filter chips', () => {
      render(<QuickFilters {...defaultProps} variant="chips" />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('should call toggleFilter when chip is clicked', async () => {
      render(<QuickFilters {...defaultProps} variant="chips" />);
      
      const activeChip = screen.getByText('Active');
      await userEvent.click(activeChip);
      
      expect(mockToggleFilter).toHaveBeenCalledWith('active');
    });

    it('should show outlined variant for inactive chips', () => {
      render(<QuickFilters {...defaultProps} variant="chips" />);
      
      const chips = screen.getAllByRole('button');
      const activeChip = chips.find(chip => chip.textContent?.includes('Active'));
      expect(activeChip).toHaveClass('MuiChip-outlined');
    });

    it('should show filled variant for active chips', () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} variant="chips" />);
      
      const chips = screen.getAllByRole('button');
      const activeChip = chips.find(chip => chip.textContent?.includes('Active'));
      expect(activeChip).toHaveClass('MuiChip-filled');
    });
  });

  describe('clear button', () => {
    it('should not show clear button when no filters are active', () => {
      render(<QuickFilters {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /Clear Filters/i })).not.toBeInTheDocument();
    });

    it('should show clear button when filters are active', () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
    });

    it('should call clearFilters when clear button is clicked', async () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
      await userEvent.click(clearButton);
      
      expect(mockClearFilters).toHaveBeenCalled();
    });

    it('should not show clear button when showClearButton is false', () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} showClearButton={false} />);
      
      expect(screen.queryByRole('button', { name: /Clear Filters/i })).not.toBeInTheDocument();
    });

    it('should show clear chip in chips variant', () => {
      mockActiveFilters = ['active'];
      render(<QuickFilters {...defaultProps} variant="chips" />);
      
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('multi-select mode', () => {
    it('should allow multiple filters to be active', () => {
      mockActiveFilters = ['active', 'pending'];
      render(<QuickFilters {...defaultProps} multiSelect />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      const pendingButton = screen.getByRole('button', { name: /Pending/i });
      
      expect(activeButton).toHaveClass('MuiButton-contained');
      expect(pendingButton).toHaveClass('MuiButton-contained');
    });
  });

  describe('filter colors', () => {
    it('should apply custom color to filter', () => {
      mockActiveFilters = ['urgent'];
      render(<QuickFilters {...defaultProps} />);
      
      const urgentButton = screen.getByRole('button', { name: /Urgent/i });
      expect(urgentButton).toHaveClass('MuiButton-containedError');
    });
  });

  describe('callback behavior', () => {
    it('should call onFilterChange when filter is toggled', async () => {
      const onFilterChange = jest.fn();
      render(<QuickFilters {...defaultProps} onFilterChange={onFilterChange} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      await userEvent.click(activeButton);
      
      expect(onFilterChange).toHaveBeenCalled();
    });

    it('should call onFilterChange when filters are cleared', async () => {
      mockActiveFilters = ['active'];
      const onFilterChange = jest.fn();
      render(<QuickFilters {...defaultProps} onFilterChange={onFilterChange} />);
      
      const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
      await userEvent.click(clearButton);
      
      expect(onFilterChange).toHaveBeenCalledWith([]);
    });
  });

  describe('empty state', () => {
    it('should render nothing when filters array is empty', () => {
      const { container } = render(
        <QuickFilters filters={[]} onFilterChange={jest.fn()} />
      );
      
      // Only the container box should exist
      const box = container.querySelector('.MuiBox-root');
      expect(box?.children.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('should have buttons with accessible names', () => {
      render(<QuickFilters {...defaultProps} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      expect(activeButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<QuickFilters {...defaultProps} />);
      
      const activeButton = screen.getByRole('button', { name: /Active/i });
      activeButton.focus();
      
      expect(document.activeElement).toBe(activeButton);
    });
  });
});
