import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for debouncing values
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 * 
 * @example
 * const debouncedSearch = useDebounce(searchText, 300);
 */
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export interface UseDebouncedSearchOptions {
  onSearch: (value: string) => void;
  delay?: number;
  initialValue?: string;
}

export interface UseDebouncedSearchResult {
  searchValue: string;
  debouncedValue: string;
  isSearching: boolean;
  setSearchValue: (value: string) => void;
  clearSearch: () => void;
}

/**
 * Hook for debounced search with loading state
 * 
 * @param options - Search configuration
 * @returns Search state and methods
 * 
 * @example
 * const { searchValue, setSearchValue, isSearching } = useDebouncedSearch({
 *   onSearch: (value) => console.log(value),
 *   delay: 300
 * });
 */
export const useDebouncedSearch = ({
  onSearch,
  delay = 300,
  initialValue = '',
}: UseDebouncedSearchOptions): UseDebouncedSearchResult => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedValue = useDebounce(searchValue, delay);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchValue !== debouncedValue) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      onSearch(debouncedValue);
    }
  }, [debouncedValue, searchValue, onSearch]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  return {
    searchValue,
    debouncedValue,
    isSearching,
    setSearchValue,
    clearSearch,
  };
};
