import React from 'react';
import { ChatState, IAIPersona } from '../types';
import {
  CHAT_LIST_MAX_ROWS,
  CHAT_LIST_PAGE_SIZE,
  CHAT_SEARCH_DEBOUNCE_MS,
  ChatListStatus,
  initialChatListStatus,
} from '../chatListQuery';
import { arePanelPropsEqual, glassPanelSx } from '../utils';

/**
 * Minimal, dependency-free interpolation.
 *
 * `il8n.t` returns the translated template (or the `defaultValue`), and the
 * injected locale bundle may or may not have substituted `{{count}}` already.
 * Doing it here means the panel renders the same string in production and under
 * the test stub, which is what makes the count assertions meaningful.
 */
const interpolate = (template: string, vars: Record<string, string | number>): string =>
  Object.keys(vars).reduce(
    (text, key) => text.split(`{{${key}}}`).join(String(vars[key])),
    String(template ?? ''),
  );

interface ChatHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  chats: ChatState[];
  chatState?: ChatState;
  getPersona?: (personaId: string) => IAIPersona | null;
  onChatSelect: (chat: ChatState) => void;
  onDeleteChat: (chatId: string) => void;
  /** Open the manual editor for a conversation's title/summary/tags/status. */
  onEditChat?: (chat: ChatState) => void;
  /** Open the explicit "transfer this conversation to another agent" flow. */
  onTransferChat?: (chat: ChatState) => void;
  /**
   * Commit a search term. Called on Enter and after the typing debounce — never
   * on every keystroke (that fired N concurrent queries whose ordering decided
   * what was rendered).
   */
  onSearch?: (query: string) => void;
  /**
   * The COMMITTED term, owned by the chat-list state in `useChatFactory`. The
   * panel renders this as the active filter; it is not panel-local, because a
   * term that lives only here is lost the moment a background refresh writes
   * the list.
   */
  activeSearchTerm?: string;
  /** Append the next page of conversations. */
  onLoadMore?: () => void;
  /** Retry the last failed list request. */
  onRetry?: () => void;
  /** Paging / loading / error state for the list. */
  listStatus?: ChatListStatus;
  Material: any;
  il8n: any;
}

/** Rows shown per persona group before "more +". */
const COLLAPSED_ROWS_PER_GROUP = 5;

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  open,
  onClose,
  chats,
  chatState,
  getPersona,
  onChatSelect,
  onDeleteChat,
  onEditChat,
  onTransferChat,
  onSearch,
  activeSearchTerm,
  onLoadMore,
  onRetry,
  listStatus,
  Material,
  il8n
}) => {
  const theme = Material.MaterialCore.useTheme();
  const mode = theme?.palette?.mode ?? 'dark';
  const {
    Paper,
    Box,
    Typography,
    IconButton,
    Button,
    List,
    ListItem,
    ListItemText,
    Chip,
    TextField,
    Alert,
    CircularProgress,
  } = Material.MaterialCore;

  const status: ChatListStatus = listStatus || initialChatListStatus();
  const committedTerm = (activeSearchTerm || '').trim();
  const isSearchActive = committedTerm.length > 0;

  // The field's own value. It runs AHEAD of the committed term while the user
  // is typing; the committed term is what the list was actually fetched with.
  const [searchInput, setSearchInput] = React.useState<string>(committedTerm);
  const [expandedSegments, setExpandedSegments] = React.useState<{ [key: string]: boolean }>({});
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSearch = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Reopening the panel shows the committed term, which is also what the rows
  // were fetched with. While the panel is closed it does not re-render at all
  // (see `arePanelPropsEqual`), so this runs exactly on open.
  const openRef = React.useRef(open);
  const lastCommittedRef = React.useRef(committedTerm);
  const searchInputRef = React.useRef(searchInput);
  searchInputRef.current = searchInput;
  React.useEffect(() => {
    const reopened = open && !openRef.current;
    openRef.current = open;
    const previous = lastCommittedRef.current;
    lastCommittedRef.current = committedTerm;
    if (!open) return;
    // Adopt the committed term when the panel opens, and afterwards only when
    // the field still holds the PREVIOUS committed term (an external reset).
    // A debounced commit can land while the user is already on the next
    // keystroke; re-syncing unconditionally would delete that character and
    // move the caret mid-word.
    if (reopened || searchInputRef.current.trim() === previous) {
      setSearchInput(committedTerm);
    }
  }, [open, committedTerm]);

  React.useEffect(() => () => cancelPendingSearch(), [cancelPendingSearch]);

  const commitSearch = React.useCallback(
    (term: string) => {
      cancelPendingSearch();
      const next = typeof term === 'string' ? term : '';
      // No redundant request when the term is already the committed one.
      if (next.trim() === committedTerm) return;
      onSearch?.(next);
    },
    [cancelPendingSearch, committedTerm, onSearch],
  );

  const handleSearchChange = React.useCallback(
    (event: any) => {
      const val = event?.target?.value ?? '';
      setSearchInput(val);
      // Debounced commit: one request for the settled term instead of one per
      // keystroke. Enter commits immediately (below).
      cancelPendingSearch();
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (val.trim() !== committedTerm) onSearch?.(val);
      }, CHAT_SEARCH_DEBOUNCE_MS);
    },
    [cancelPendingSearch, committedTerm, onSearch],
  );

  const handleSearchKeyDown = React.useCallback(
    (event: any) => {
      if (event?.key === 'Enter') {
        event.preventDefault?.();
        commitSearch(searchInput);
        return;
      }
      if (event?.key === 'Escape') {
        event.preventDefault?.();
        setSearchInput('');
        commitSearch('');
      }
    },
    [commitSearch, searchInput],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchInput('');
    commitSearch('');
  }, [commitSearch]);

  const activePersonaId = chatState?.personaId || chatState?.persona?.id;

  // Group chats by persona
  const groupedChats = React.useMemo(() => {
    if (!chats || chats.length === 0) return [];

    const groups: { [key: string]: ChatState[] } = {};
    chats.forEach((chat) => {
      const pId = chat.personaId || 'unknown';
      if (!groups[pId]) {
        groups[pId] = [];
      }
      groups[pId].push(chat);
    });

    // Sort chats within each group by created date (most recent first)
    Object.keys(groups).forEach((pId) => {
      groups[pId].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    });

    // Convert to array of groups
    const groupArray = Object.keys(groups).map((pId) => {
      const groupPersona = getPersona ? getPersona(pId) : null;
      const groupChats = groups[pId];
      const latestChatDate = groupChats[0]?.created ? new Date(groupChats[0].created).getTime() : 0;
      return {
        personaId: pId,
        persona: groupPersona,
        chats: groupChats,
        latestChatDate,
      };
    });

    // Sort groups: active persona group first, then others by latest chat date
    groupArray.sort((a, b) => {
      if (a.personaId === activePersonaId) return -1;
      if (b.personaId === activePersonaId) return 1;
      return b.latestChatDate - a.latestChatDate;
    });

    return groupArray;
  }, [chats, activePersonaId, getPersona]);

  const totalLoaded = chats?.length || 0;
  const hasRows = totalLoaded > 0;
  const canLoadMore = !status.exhausted && !status.capped && !!onLoadMore;

  return (
    <Paper
      elevation={3}
      sx={{
        ...glassPanelSx(mode),
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 3,
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <IconButton
          onClick={onClose}
          sx={{ mr: 2 }}
          aria-label="Close chat history"
        >
          <Material.MaterialIcons.ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.chat.history.title', { defaultValue: 'Chat History' })}
        </Typography>
      </Box>

      {/* Content - Split Layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Side - Chat List */}
        <Box sx={{
          width: '40%',
          borderRight: 1,
          borderColor: 'divider',
          overflow: 'auto',
          p: 2
        }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            {il8n?.t('reactor.client.chat.history.conversations', { defaultValue: 'Conversations' })}
          </Typography>

          {/*
            The search field is ALWAYS rendered. It used to be gated behind
            "clicked more + twice", which made search undiscoverable for exactly
            the users who most needed it.
          */}
          <TextField
            size="small"
            fullWidth
            placeholder={il8n?.t('reactor.client.chat.history.searchPlaceholder', { defaultValue: 'Search conversations...' })}
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            sx={{ mb: 1 }}
            inputProps={{
              'aria-label': il8n?.t('reactor.client.chat.history.searchPlaceholder', {
                defaultValue: 'Search conversations...',
              }),
              'data-testid': 'chat-history-search',
            }}
            InputProps={{
              startAdornment: (
                <IconButton disabled size="small" sx={{ p: 0, mr: 1 }}>
                  <Material.MaterialIcons.Search sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                </IconButton>
              ),
              endAdornment: searchInput || committedTerm ? (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  aria-label={il8n?.t('reactor.client.chat.history.clearSearch', {
                    defaultValue: 'Clear search',
                  })}
                >
                  <Material.MaterialIcons.Clear sx={{ fontSize: '1rem' }} />
                </IconButton>
              ) : null,
            }}
          />

          {/* Active filter: the committed term, the match count and a reset. */}
          {isSearchActive && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'action.selected',
              }}
              data-testid="chat-history-active-filter"
              role="status"
              aria-live="polite"
            >
              <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {interpolate(
                  il8n?.t('reactor.client.chat.history.activeFilter', {
                    defaultValue: 'Filtering by "{{term}}"',
                    term: committedTerm,
                  }) ?? 'Filtering by "{{term}}"',
                  { term: committedTerm },
                )}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                data-testid="chat-history-match-count"
                label={interpolate(
                  // The server returns no total, so an unfinished list is
                  // reported as "N+" instead of claiming N is the match count.
                  status.exhausted
                    ? il8n?.t('reactor.client.chat.history.matchCount', {
                        defaultValue: '{{count}} matches',
                        count: totalLoaded,
                      }) ?? '{{count}} matches'
                    : il8n?.t('reactor.client.chat.history.matchCountPartial', {
                        defaultValue: '{{count}}+ matches',
                        count: totalLoaded,
                      }) ?? '{{count}}+ matches',
                  { count: totalLoaded },
                )}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
              <Button
                size="small"
                variant="text"
                onClick={handleClearSearch}
                sx={{ minWidth: 0, px: 0.5, fontSize: '0.7rem' }}
              >
                {il8n?.t('reactor.client.chat.history.resetFilter', { defaultValue: 'Reset' })}
              </Button>
            </Box>
          )}

          {/* A replace in flight while rows are on screen: the committed term is
              already displayed above, so say that the list is still catching up
              rather than leaving stale rows looking authoritative. */}
          {status.loading && hasRows && (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              data-testid="chat-history-updating"
            >
              {CircularProgress ? <CircularProgress size={12} /> : null}
              <Typography variant="caption" color="text.secondary">
                {il8n?.t('reactor.client.chat.history.updating', { defaultValue: 'Updating list…' })}
              </Typography>
            </Box>
          )}

          {/* Load failure: an explicit error with a retry, never "No chats found". */}
          {status.error && (
            <Alert
              severity="error"
              sx={{ mb: 2, py: 0.25 }}
              action={
                onRetry ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={onRetry}
                    data-testid="chat-history-retry"
                  >
                    {il8n?.t('reactor.client.chat.history.retry', { defaultValue: 'Retry' })}
                  </Button>
                ) : undefined
              }
            >
              <Typography variant="caption">
                {il8n?.t('reactor.client.chat.history.loadError', {
                  defaultValue: 'Conversations could not be loaded.',
                })}
              </Typography>
            </Alert>
          )}

          {groupedChats && groupedChats.length > 0 ? (
            <List sx={{ p: 0 }}>
              {groupedChats.map((group) => {
                const groupPersona = group.persona;
                const isGroupActive = group.personaId === activePersonaId;
                const sortedChats = group.chats;
                // A search result set is already narrowed: collapsing it would
                // hide matches behind an affordance the user did not ask for.
                const isExpanded = isSearchActive || !!expandedSegments[group.personaId];
                const visibleChats = isExpanded
                  ? sortedChats
                  : sortedChats.slice(0, COLLAPSED_ROWS_PER_GROUP);
                const hiddenCount = sortedChats.length - visibleChats.length;

                return (
                  <Box key={group.personaId} sx={{ mb: 2 }}>
                    {/* Persona Header */}
                    <Box sx={{
                      px: 1.5,
                      py: 0.75,
                      bgcolor: isGroupActive ? 'primary.light' : 'action.selected',
                      borderRadius: 1,
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: 3,
                      borderColor: isGroupActive ? 'primary.main' : 'text.secondary',
                      opacity: isGroupActive ? 1 : 0.9,
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: isGroupActive ? 'primary.contrastText' : 'text.primary' }}>
                        {groupPersona?.name || il8n?.t('reactor.client.chat.history.unknownAgent', { defaultValue: 'Unknown Agent' })}
                      </Typography>
                      {isGroupActive && (
                        <Chip
                          label="Active Persona"
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold' }}
                        />
                      )}
                    </Box>

                    {/* Chats inside this group */}
                    {visibleChats.map((chat) => {
                      const label = chat.title
                        || il8n?.t('reactor.client.chat.history.emptyChat', { defaultValue: 'Empty Chat' });
                      // The agent maintains a status icon + colour (and optional tags/summary)
                      // via the updateChatData tool; render them when present.
                      const StatusIcon = chat.icon ? (Material.MaterialIcons as any)?.[chat.icon] : null;
                      const statusColor = chat.color || 'text.secondary';
                      const chatTags = Array.isArray(chat.tags) ? chat.tags : [];
                      const isSelected = chatState?.id === chat.id;

                      return (
                        <ListItem
                          key={chat.id || `chat-${chat.created}`}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 1,
                            mb: 0.5,
                            pl: 2, // indent chats slightly under header
                            border: chatState?.id === chat.id ? 2 : 1,
                            borderColor: chatState?.id === chat.id ? 'primary.main' : 'divider',
                            bgcolor: chatState?.id === chat.id ? 'primary.light' : 'transparent',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            }
                          }}
                          onClick={() => onChatSelect(chat)}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {onEditChat && (
                                <IconButton
                                  edge="end"
                                  aria-label="Edit conversation details"
                                  title="Edit conversation details"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditChat(chat);
                                  }}
                                  size="small"
                                  sx={{
                                    opacity: 0.7,
                                    '&:hover': {
                                      opacity: 1,
                                    }
                                  }}
                                >
                                  <Material.MaterialIcons.Edit />
                                </IconButton>
                              )}
                              <IconButton
                                edge="end"
                                aria-label="Delete chat"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteChat(chat.id);
                                }}
                                size="small"
                                color="error"
                                sx={{
                                  opacity: 0.7,
                                  '&:hover': {
                                    opacity: 1,
                                  }
                                }}
                              >
                                <Material.MaterialIcons.Delete />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            disableTypography
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {StatusIcon ? (
                                  <Box
                                    component={StatusIcon}
                                    title={chat.icon}
                                    sx={{ fontSize: 16, color: statusColor, flexShrink: 0 }}
                                  />
                                ) : chat.color ? (
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: statusColor,
                                      flexShrink: 0,
                                    }}
                                    title="Conversation status"
                                  />
                                ) : null}
                                <Typography variant="body2" sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                                  {label.substring(0, 50)}{label.length > 50 ? '...' : ''}
                                </Typography>
                                {chat.active && (
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: 'success.main',
                                      boxShadow: '0 0 6px #2e7d32',
                                    }}
                                    title="Active session"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box component="span" sx={{ display: 'block' }}>
                                {chat.summary && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    component="span"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {chat.summary}
                                  </Typography>
                                )}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    flexWrap: 'wrap',
                                    mt: chat.summary ? 0.5 : 0,
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(chat.created).toLocaleDateString()}
                                  </Typography>
                                  {chatTags.slice(0, 3).map((tag: string) => (
                                    <Chip
                                      key={tag}
                                      label={tag}
                                      size="small"
                                      variant="outlined"
                                      sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}

                    {/*
                      Per-persona collapse. It only ever reveals rows that are
                      ALREADY loaded, and it reports how many are hidden, so it
                      can never silently swallow a row that paging just
                      appended — and it stays visible while rows are hidden
                      (it used to disappear once expanded, which is why nothing
                      signalled that older conversations existed).
                      "Load more" below is the separate, server-side affordance.
                    */}
                    {hiddenCount > 0 && (
                      <Box
                        onClick={() => {
                          setExpandedSegments((prev) => ({ ...prev, [group.personaId]: true }));
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e: any) => {
                          if (e?.key === 'Enter' || e?.key === ' ') {
                            e.preventDefault?.();
                            setExpandedSegments((prev) => ({ ...prev, [group.personaId]: true }));
                          }
                        }}
                        data-testid={`chat-history-more-${group.personaId}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          py: 0.5,
                          cursor: 'pointer',
                          color: 'primary.main',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {interpolate(
                          il8n?.t('reactor.client.chat.history.moreWithCount', {
                            defaultValue: 'more + ({{count}})',
                            count: hiddenCount,
                          }) ?? 'more + ({{count}})',
                          { count: hiddenCount },
                        )}
                      </Box>
                    )}
                    {hiddenCount === 0 && !!expandedSegments[group.personaId] && !isSearchActive
                      && sortedChats.length > COLLAPSED_ROWS_PER_GROUP && (
                        <Box
                          onClick={() => {
                            setExpandedSegments((prev) => ({ ...prev, [group.personaId]: false }));
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e: any) => {
                            if (e?.key === 'Enter' || e?.key === ' ') {
                              e.preventDefault?.();
                              setExpandedSegments((prev) => ({ ...prev, [group.personaId]: false }));
                            }
                          }}
                          data-testid={`chat-history-less-${group.personaId}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 0.5,
                            cursor: 'pointer',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {il8n?.t('reactor.client.chat.history.showLess', { defaultValue: 'less −' })}
                        </Box>
                      )}
                  </Box>
                );
              })}
            </List>
          ) : !status.error && !status.loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {isSearchActive
                  ? interpolate(
                      il8n?.t('reactor.client.chat.history.noMatches', {
                        defaultValue: 'No conversations match "{{term}}"',
                        term: committedTerm,
                      }) ?? 'No conversations match "{{term}}"',
                      { term: committedTerm },
                    )
                  : il8n?.t('reactor.client.chat.history.empty', { defaultValue: 'No chats found' })}
              </Typography>
            </Box>
          ) : null}

          {/* First-page load indicator — only while there is nothing to show. */}
          {status.loading && !hasRows && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }} data-testid="chat-history-loading">
              {CircularProgress ? <CircularProgress size={16} /> : null}
              <Typography variant="caption" color="text.secondary">
                {il8n?.t('reactor.client.chat.history.loading', { defaultValue: 'Loading conversations…' })}
              </Typography>
            </Box>
          )}

          {/*
            Server-side paging footer. Three mutually exclusive states, so the
            affordances can never contradict the list:
              * a full page is loaded and more exist  -> "Load more"
              * the cap was reached                   -> say so, do not pretend
              * a short page came back                -> "All conversations loaded"
          */}
          {hasRows && (
            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }} data-testid="chat-history-paging">
              {canLoadMore && (
                <Button
                  fullWidth
                  size="small"
                  variant="text"
                  onClick={onLoadMore}
                  disabled={status.loadingMore || status.loading}
                  data-testid="chat-history-load-more"
                  startIcon={status.loadingMore && CircularProgress ? <CircularProgress size={12} /> : undefined}
                >
                  {status.loadingMore
                    ? il8n?.t('reactor.client.chat.history.loadingMore', { defaultValue: 'Loading more conversations…' })
                    : interpolate(
                        il8n?.t('reactor.client.chat.history.loadMore', {
                          defaultValue: 'Load more ({{count}} loaded)',
                          count: totalLoaded,
                        }) ?? 'Load more ({{count}} loaded)',
                        { count: totalLoaded },
                      )}
                </Button>
              )}

              {status.capped && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', px: 1 }}
                  data-testid="chat-history-capped"
                >
                  {interpolate(
                    il8n?.t('reactor.client.chat.history.capReached', {
                      defaultValue: 'Showing the first {{count}} conversations. Refine your search to narrow the list.',
                      count: CHAT_LIST_MAX_ROWS,
                    }) ?? 'Showing the first {{count}} conversations. Refine your search to narrow the list.',
                    { count: CHAT_LIST_MAX_ROWS },
                  )}
                </Typography>
              )}

              {status.exhausted && !status.capped && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center' }}
                  data-testid="chat-history-all-loaded"
                >
                  {il8n?.t('reactor.client.chat.history.allLoaded', { defaultValue: 'All conversations loaded' })}
                </Typography>
              )}
            </Box>
          )}

          {/* Page size is exposed for screen readers and for the odd support call. */}
          {hasRows && (
            <Box sx={{ display: 'none' }} data-testid="chat-history-page-size">{CHAT_LIST_PAGE_SIZE}</Box>
          )}
        </Box>

        {/* Right Side - Preview */}
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          p: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.chat.history.preview', { defaultValue: 'Preview' })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {onEditChat && chatState?.id && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Material.MaterialIcons.Edit />}
                  onClick={() => onEditChat(chatState)}
                >
                  {il8n?.t('reactor.client.chat.history.editDetails', {
                    defaultValue: 'Edit details',
                  })}
                </Button>
              )}
              {onTransferChat && chatState?.id && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Material.MaterialIcons.SwapHoriz />}
                  onClick={() => onTransferChat(chatState)}
                >
                  {il8n?.t('reactor.client.chat.transfer.action', {
                    defaultValue: 'Transfer',
                  })}
                </Button>
              )}
            </Box>
          </Box>
          {chatState?.history && chatState.history.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {il8n?.t('reactor.client.chat.history.messages', { defaultValue: 'Messages' })}: {chatState.history.length}
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {chatState.history.slice(-5).map((message, index) => {
                  const rawContent = message.content as unknown;
                  const messagePreview = typeof rawContent === 'string'
                    ? rawContent.substring(0, 100)
                    : Array.isArray(rawContent)
                      ? ((rawContent as any[]).find((p) => p.type === 'text')?.text?.substring(0, 100) ?? '[Image message]')
                      : 'Message content not available';
                  const truncatedPreview = messagePreview.length > 100
                    ? messagePreview + '...'
                    : messagePreview;

                  return (
                    <Box key={`message-${index}-${message.role}`} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="body2">
                        {truncatedPreview}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {il8n?.t('reactor.client.chat.history.noPreview', { defaultValue: 'No messages to preview' })}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// Memoised with the shared panel comparator: while closed this panel skips
// the parent's re-renders entirely (see `arePanelPropsEqual`). Every callback
// prop must therefore stay identity-stable in ReactorChat — the list
// controllers (`onSearch`, `onLoadMore`, `onRetry`) are `useCallback` wrappers
// over refs inside `useChatFactory`.
export default React.memo(ChatHistoryPanel, arePanelPropsEqual);
