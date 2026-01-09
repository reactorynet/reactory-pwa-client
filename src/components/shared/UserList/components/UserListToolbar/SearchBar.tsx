/**
 * SearchBar Component
 * 
 * Search input with debouncing for user filtering
 * 
 * @module UserList/components/UserListToolbar/SearchBar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  useTheme,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { getUserListStyles } from '../../styles/userList.styles';

export interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  placeholder = 'Search users...',
  onChange,
  debounceMs = 300,
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const [inputValue, setInputValue] = useState(value);

  // Update input when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, value, onChange, debounceMs]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onChange(inputValue);
    } else if (event.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <Box sx={styles.searchContainer}>
      <Box sx={styles.searchIcon}>
        <Search />
      </Box>
      <InputBase
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        sx={styles.searchInput}
        inputProps={{
          'aria-label': 'search users',
        }}
        endAdornment={
          inputValue && (
            <IconButton
              size="small"
              onClick={handleClear}
              aria-label="clear search"
              edge="end"
              sx={{ mr: 1 }}
            >
              <Clear fontSize="small" />
            </IconButton>
          )
        }
      />
    </Box>
  );
};

export default SearchBar;

