/**
 * UserListPagination Component
 * 
 * Pagination controls for the user list
 * 
 * @module UserList/components/UserListPagination
 */

import React from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import {
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import type { UserListPaginationProps } from '../../types';
import { getUserListStyles } from '../../styles/userList.styles';

export const UserListPagination: React.FC<UserListPaginationProps> = ({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  variant = 'standard',
}) => {
  const theme = useTheme();
  const styles = getUserListStyles(theme);

  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handleFirstPage = () => {
    if (page > 1) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const handleLastPage = () => {
    if (page < totalPages) {
      onPageChange(totalPages);
    }
  };

  const handlePageSizeChange = (event: any) => {
    onPageSizeChange(Number(event.target.value));
    // Reset to page 1 when changing page size
    if (page !== 1) {
      onPageChange(1);
    }
  };

  if (total === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Box sx={styles.pagination}>
        <Typography variant="body2" sx={styles.paginationInfo}>
          {startIndex}-{endIndex} of {total}
        </Typography>
        <Box sx={styles.paginationControls}>
          <IconButton
            onClick={handlePreviousPage}
            disabled={page === 1}
            size="small"
            aria-label="Previous page"
          >
            <NavigateBefore />
          </IconButton>
          <IconButton
            onClick={handleNextPage}
            disabled={page === totalPages}
            size="small"
            aria-label="Next page"
          >
            <NavigateNext />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={styles.pagination}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={styles.paginationInfo}>
          Showing {startIndex}-{endIndex} of {total} users
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">Rows per page:</Typography>
          <Select
            value={pageSize}
            onChange={handlePageSizeChange}
            size="small"
            variant="outlined"
            sx={{ minWidth: 70 }}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <Box sx={styles.paginationControls}>
        <IconButton
          onClick={handleFirstPage}
          disabled={page === 1}
          size="small"
          aria-label="First page"
        >
          <FirstPage />
        </IconButton>
        <IconButton
          onClick={handlePreviousPage}
          disabled={page === 1}
          size="small"
          aria-label="Previous page"
        >
          <NavigateBefore />
        </IconButton>

        <Typography variant="body2" sx={{ mx: 2 }}>
          Page {page} of {totalPages}
        </Typography>

        <IconButton
          onClick={handleNextPage}
          disabled={page === totalPages}
          size="small"
          aria-label="Next page"
        >
          <NavigateNext />
        </IconButton>
        <IconButton
          onClick={handleLastPage}
          disabled={page === totalPages}
          size="small"
          aria-label="Last page"
        >
          <LastPage />
        </IconButton>
      </Box>
    </Box>
  );
};

export default UserListPagination;

