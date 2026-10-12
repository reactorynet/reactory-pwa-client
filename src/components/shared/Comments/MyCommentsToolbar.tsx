import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

import { resolveCommentResource } from './commentResourceLinks';
import { MY_COMMENT_STATS_QUERY } from './myCommentsForm/graphql';

/**
 * Custom toolbar for the "My Comments" grid.
 *
 * Owns the grid's query inputs: a debounced free-text search and a context
 * filter (facet counts sourced from `getMyCommentStats`). It talks to the grid
 * only through the `onQueryChange` contract the MaterialTableWidget exposes, so
 * paging stays server-side.
 *
 * Registered as `core.MyCommentsToolbar@1.0.0`.
 */
interface CommentContextStat {
  context: string;
  count: number;
}

export interface MyCommentsToolbarProps {
  reactory?: Reactory.Client.ReactorySDK;
  loading?: boolean;
  /** `{ filter: { searchString, context }, paging: { page, pageSize } }` */
  queryVariables?: {
    filter?: { searchString?: string; context?: string };
    paging?: { page?: number; pageSize?: number };
  };
  data?: { data?: any[]; paging?: { total?: number } };
  onQueryChange?: (queryName: string, variables: any) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

export const MyCommentsToolbar: React.FC<MyCommentsToolbarProps> = (props) => {
  const hookReactory = useReactory();
  const reactory = props.reactory || hookReactory;

  const filter = props.queryVariables?.filter || {};
  const paging = props.queryVariables?.paging || {};

  const [searchInput, setSearchInput] = useState<string>(filter.searchString || '');
  const [context, setContext] = useState<string>(filter.context || '');
  const [stats, setStats] = useState<CommentContextStat[]>([]);

  // Skip the debounce effect on first render so the toolbar does not trigger a
  // redundant query immediately after the grid's own initial fetch.
  const firstRunRef = useRef(true);

  const emitQuery = useCallback(
    (next: { searchString?: string; context?: string; resetPage?: boolean }) => {
      if (typeof props.onQueryChange !== 'function') return;
      const nextSearch = next.searchString !== undefined ? next.searchString : searchInput;
      const nextContext = next.context !== undefined ? next.context : context;

      const filterPayload: Record<string, any> = { searchString: nextSearch };
      if (nextContext) filterPayload.context = nextContext;

      props.onQueryChange('getMyComments', {
        filter: filterPayload,
        paging: {
          page: next.resetPage === false ? (paging.page || 1) : 1,
          pageSize: paging.pageSize || 10,
        },
      });
    },
    [props, searchInput, context, paging.page, paging.pageSize]
  );

  // Debounced search.
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return undefined;
    }
    const handle = setTimeout(() => {
      emitQuery({ searchString: searchInput, resetPage: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // Intentionally depend only on the search input — context changes emit
    // immediately via the select handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const fetchStats = useCallback(async () => {
    if (!reactory || typeof reactory.graphqlQuery !== 'function') return;
    try {
      const result = await reactory.graphqlQuery<{ getMyCommentStats: CommentContextStat[] }, {}>(
        MY_COMMENT_STATS_QUERY,
        {}
      );
      setStats(result?.data?.getMyCommentStats || []);
    } catch {
      // Facet counts are non-critical; the filter still works without them.
    }
  }, [reactory]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const contextOptions = useMemo(() => {
    const present = new Set<string>(stats.map((stat) => stat.context));
    if (context) present.add(context);
    return Array.from(present).filter(Boolean).sort();
  }, [stats, context]);

  const countFor = (value: string): number | undefined =>
    stats.find((stat) => stat.context === value)?.count;

  const handleRefresh = () => {
    void fetchStats();
    // Re-issue the current query (new object reference => grid refetches).
    emitQuery({ searchString: searchInput, context, resetPage: false });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          select
          size="small"
          label="Context"
          value={context}
          onChange={(event) => {
            const next = event.target.value;
            setContext(next);
            emitQuery({ context: next, resetPage: true });
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All contexts</MenuItem>
          {contextOptions.map((option) => {
            const count = countFor(option);
            return (
              <MenuItem key={option} value={option}>
                {resolveCommentResource({ context: option }).label}
                {typeof count === 'number' ? ` (${count})` : ''}
              </MenuItem>
            );
          })}
        </TextField>

        <TextField
          size="small"
          label="Search my comments"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={handleRefresh} disabled={props.loading === true} aria-label="Refresh">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Button variant="text" onClick={handleRefresh} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>

        {typeof props.data?.paging?.total === 'number' && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {props.data.paging.total} comment{props.data.paging.total === 1 ? '' : 's'}
          </Typography>
        )}
      </Stack>

      {props.loading === true && <LinearProgress data-testid="my-comments-toolbar-loading" />}
    </Box>
  );
};

export default MyCommentsToolbar;
