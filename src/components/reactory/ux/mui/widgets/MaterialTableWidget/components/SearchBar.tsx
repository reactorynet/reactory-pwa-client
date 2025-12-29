import React from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tooltip,
  Icon,
} from '@mui/material';
import { useDebouncedSearch } from '../hooks/useDebounce';

export interface SearchBarProps {
  onSearch: (searchText: string) => void;
  placeholder?: string;
  debounceDelay?: number;
  initialValue?: string;
  showSearchButton?: boolean;
  showHelpTooltip?: boolean;
  helpText?: string;
  fullWidth?: boolean;
}

/**
 * SearchBar Component
 * 
 * Debounced search input with loading indicator and optional help tooltip
 * 
 * @example
 * <SearchBar
 *   onSearch={(text) => console.log(text)}
 *   placeholder="Search tickets..."
 *   debounceDelay={300}
 *   showHelpTooltip
 * />
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search...',
  debounceDelay = 300,
  initialValue = '',
  showSearchButton = false,
  showHelpTooltip = false,
  helpText = 'Search across all fields',
  fullWidth = false,
}) => {
  const { searchValue, setSearchValue, isSearching, clearSearch } = useDebouncedSearch({
    onSearch,
    delay: debounceDelay,
    initialValue,
  });

  const handleClear = () => {
    clearSearch();
  };

  const handleSearch = () => {
    if (showSearchButton) {
      onSearch(searchValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showSearchButton) {
      handleSearch();
    }
  };

  return (
    <TextField
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      fullWidth={fullWidth}
      size="small"
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Icon>search</Icon>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {isSearching && <CircularProgress size={20} />}
            {!isSearching && searchValue && (
              <IconButton size="small" onClick={handleClear} edge="end">
                <Icon>clear</Icon>
              </IconButton>
            )}
            {showSearchButton && (
              <IconButton size="small" onClick={handleSearch} edge="end">
                <Icon>search</Icon>
              </IconButton>
            )}
            {showHelpTooltip && (
              <Tooltip title={helpText} arrow>
                <IconButton size="small" edge="end">
                  <Icon fontSize="small">help_outline</Icon>
                </IconButton>
              </Tooltip>
            )}
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: 1,
          },
          '&.Mui-focused': {
            boxShadow: 2,
          },
        },
      }}
    />
  );
};
