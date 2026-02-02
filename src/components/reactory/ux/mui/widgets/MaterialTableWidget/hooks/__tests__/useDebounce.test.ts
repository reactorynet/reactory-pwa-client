/**
 * Tests for useDebounce and useDebouncedSearch hooks
 * @module MaterialTableWidget/hooks/__tests__/useDebounce
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce, useDebouncedSearch } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('should work with different value types', () => {
      const { result: stringResult } = renderHook(() => useDebounce('string', 300));
      const { result: numberResult } = renderHook(() => useDebounce(42, 300));
      const { result: objectResult } = renderHook(() => useDebounce({ key: 'value' }, 300));

      expect(stringResult.current).toBe('string');
      expect(numberResult.current).toBe(42);
      expect(objectResult.current).toEqual({ key: 'value' });
    });
  });

  describe('debouncing behavior', () => {
    it('should not update value immediately on change', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      
      expect(result.current).toBe('initial');
    });

    it('should update value after delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'a' } }
      );

      // Rapid changes
      rerender({ value: 'b' });
      act(() => { jest.advanceTimersByTime(100); });
      
      rerender({ value: 'c' });
      act(() => { jest.advanceTimersByTime(100); });
      
      rerender({ value: 'd' });
      act(() => { jest.advanceTimersByTime(100); });

      // Still showing 'a' because timer keeps resetting
      expect(result.current).toBe('a');

      // Wait for full debounce period
      act(() => { jest.advanceTimersByTime(300); });
      
      // Now shows final value
      expect(result.current).toBe('d');
    });

    it('should handle different delay values', () => {
      const { result: shortDelay, rerender: rerenderShort } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 'initial' } }
      );

      const { result: longDelay, rerender: rerenderLong } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerenderShort({ value: 'updated' });
      rerenderLong({ value: 'updated' });

      act(() => { jest.advanceTimersByTime(200); });

      expect(shortDelay.current).toBe('updated');
      expect(longDelay.current).toBe('initial');
    });
  });

  describe('cleanup', () => {
    it('should cancel pending timer on unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      // Timer should have been cancelled, no error should occur
      act(() => { jest.advanceTimersByTime(300); });
    });
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty string by default', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch })
      );

      expect(result.current.searchValue).toBe('');
      expect(result.current.debouncedValue).toBe('');
    });

    it('should initialize with provided initial value', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, initialValue: 'test' })
      );

      expect(result.current.searchValue).toBe('test');
    });

    it('should call onSearch on initial mount with initial value', () => {
      const onSearch = jest.fn();
      renderHook(() =>
        useDebouncedSearch({ onSearch, initialValue: '' })
      );

      // The hook calls onSearch on initial mount
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('search functionality', () => {
    it('should call onSearch after debounce delay when value changes', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, delay: 300 })
      );

      onSearch.mockClear(); // Clear initial call

      act(() => {
        result.current.setSearchValue('test query');
      });

      // Should not be called immediately with the new value
      expect(onSearch).not.toHaveBeenCalledWith('test query');

      act(() => { jest.advanceTimersByTime(300); });

      expect(onSearch).toHaveBeenCalledWith('test query');
    });

    it('should show searching state while debouncing', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, delay: 300 })
      );

      expect(result.current.isSearching).toBe(false);

      act(() => {
        result.current.setSearchValue('query');
      });

      expect(result.current.isSearching).toBe(true);

      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.isSearching).toBe(false);
    });

    it('should update searchValue immediately', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, delay: 300 })
      );

      act(() => {
        result.current.setSearchValue('q');
      });

      expect(result.current.searchValue).toBe('q');

      act(() => {
        result.current.setSearchValue('qu');
      });

      expect(result.current.searchValue).toBe('qu');
    });

    it('should debounce rapid changes and only call with final value', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, delay: 300 })
      );

      onSearch.mockClear();

      act(() => {
        result.current.setSearchValue('q');
      });
      act(() => { jest.advanceTimersByTime(100); });
      
      act(() => {
        result.current.setSearchValue('qu');
      });
      act(() => { jest.advanceTimersByTime(100); });
      
      act(() => {
        result.current.setSearchValue('que');
      });
      act(() => { jest.advanceTimersByTime(300); });

      // Should have been called with the final value
      expect(onSearch).toHaveBeenCalledWith('que');
    });
  });

  describe('clearSearch', () => {
    it('should clear the search value', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, initialValue: 'test' })
      );

      expect(result.current.searchValue).toBe('test');

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchValue).toBe('');
    });

    it('should trigger onSearch with empty string after clear', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, initialValue: 'test', delay: 300 })
      );

      onSearch.mockClear();

      act(() => {
        result.current.clearSearch();
      });

      act(() => { jest.advanceTimersByTime(300); });

      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('custom delay', () => {
    it('should respect custom delay value', () => {
      const onSearch = jest.fn();
      const { result } = renderHook(() =>
        useDebouncedSearch({ onSearch, delay: 500 })
      );

      onSearch.mockClear();

      act(() => {
        result.current.setSearchValue('query');
      });

      act(() => { jest.advanceTimersByTime(300); });
      expect(onSearch).not.toHaveBeenCalledWith('query');

      act(() => { jest.advanceTimersByTime(200); });
      expect(onSearch).toHaveBeenCalledWith('query');
    });
  });
});
