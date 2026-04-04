import React from 'react';
import { SidePanelItem } from '../types';

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_PERCENT = 0.75;
const DEFAULT_SPLIT = 0.5; // 50/50 by default
const DRAG_HANDLE_WIDTH = 6;

export interface SidePanelProps {
  open: boolean;
  items: SidePanelItem[];
  activeItemId?: string;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onSelectItem: (id: string) => void;
  reactory: Reactory.Client.ReactorySDK;
}

/**
 * Renders a single side-panel item, memoized so it only re-renders when
 * the item's own identity (id, componentFqn) or props change.
 */
const SidePanelItemRenderer = React.memo(({ item, reactory }: {
  item: SidePanelItem;
  reactory: Reactory.Client.ReactorySDK;
}) => {
  const Component = React.useMemo(
    () => reactory.getComponent(item.componentFqn) as React.ComponentType<any> | null,
    [item.componentFqn, reactory],
  );

  if (!Component) {
    const { Material } = reactory.getComponents<{
      Material: Reactory.Client.Web.IMaterialModule;
    }>(['material-ui.Material']);
    const { Box, Typography } = Material.MaterialCore;
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Component <code>{item.componentFqn}</code> not found.
        </Typography>
      </Box>
    );
  }

  return <Component {...item.props} />;
}, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.componentFqn === next.item.componentFqn &&
    prev.item.props === next.item.props
  );
});

const SidePanel: React.FC<SidePanelProps> = React.memo(({
  open,
  items,
  activeItemId,
  onClose,
  onRemoveItem,
  onSelectItem,
  reactory,
}) => {
  const {
    React: ReactLib,
    Material,
  } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>(['react.React', 'material-ui.Material']);

  const {
    Box,
    Typography,
    IconButton,
    Icon,
    Tabs,
    Tab,
    Paper,
    Tooltip,
    Drawer,
    useMediaQuery,
    useTheme,
  } = Material.MaterialCore;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Resizable panel width as a fraction of the parent container
  const [splitRatio, setSplitRatio] = ReactLib.useState<number>(() => {
    try {
      const saved = localStorage.getItem('reactorChat.sidePanelSplit');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.2 && val <= MAX_PANEL_PERCENT) return val;
      }
    } catch { /* ignore */ }
    return DEFAULT_SPLIT;
  });

  const containerRef = ReactLib.useRef<HTMLDivElement>(null);
  const isDragging = ReactLib.useRef(false);
  const rafId = ReactLib.useRef<number>(0);

  const handleMouseDown = ReactLib.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      // Batch resize updates in a single animation frame to prevent
      // ResizeObserver loop errors from cascading layout changes.
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const parent = containerRef.current?.parentElement;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const parentWidth = parentRect.width;
        const panelWidth = parentRect.right - ev.clientX;
        const ratio = Math.min(MAX_PANEL_PERCENT, Math.max(MIN_PANEL_WIDTH / parentWidth, panelWidth / parentWidth));
        setSplitRatio(ratio);
      });
    };

    const onMouseUp = () => {
      isDragging.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      try {
        setSplitRatio((current) => {
          localStorage.setItem('reactorChat.sidePanelSplit', String(current));
          return current;
        });
      } catch { /* ignore */ }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Clean up animation frame on unmount
  ReactLib.useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const activeItem = items.find((i) => i.id === activeItemId) ?? items[0];
  const activeIndex = items.findIndex((i) => i.id === activeItem?.id);

  const handleTabChange = ReactLib.useCallback(
    (_: any, newIndex: number) => {
      if (items[newIndex]) {
        onSelectItem(items[newIndex].id);
      }
    },
    [items, onSelectItem],
  );

  const emptyState = (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}>
        dashboard_customize
      </Icon>
      <Typography color="text.secondary">
        No components mounted. The AI assistant can add components and forms here.
      </Typography>
    </Box>
  );

  const panelContent = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48,
        }}
      >
        <Icon sx={{ mr: 1, color: 'primary.main' }}>dashboard_customize</Icon>
        <Typography variant="subtitle2" sx={{ flex: 1 }} noWrap>
          {activeItem?.title || 'Side Panel'}
        </Typography>
        <Tooltip title="Close side panel">
          <IconButton size="small" onClick={onClose}>
            <Icon fontSize="small">close</Icon>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs (when multiple items) */}
      {items.length > 1 && (
        <Tabs
          value={activeIndex >= 0 ? activeIndex : 0}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider' }}
        >
          {items.map((item) => (
            <Tab
              key={item.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" noWrap sx={{ maxWidth: 100 }}>
                    {item.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    sx={{ p: 0, ml: 0.5 }}
                  >
                    <Icon sx={{ fontSize: 14 }}>close</Icon>
                  </IconButton>
                </Box>
              }
              sx={{ minHeight: 36, py: 0, px: 1, textTransform: 'none' }}
            />
          ))}
        </Tabs>
      )}

      {/* Content area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {items.length === 0 ? emptyState : items.map((item) => (
          <Box
            key={item.id}
            sx={{ display: item.id === activeItem?.id ? 'block' : 'none', height: '100%' }}
          >
            <SidePanelItemRenderer item={item} reactory={reactory} />
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Mobile: full-width side panel, chat becomes a floating mini dialog
  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={open && items.length > 0}
        onClose={onClose}
        PaperProps={{ sx: { width: '100%' } }}
      >
        {panelContent}
      </Drawer>
    );
  }

  // Desktop: inline docked panel with resizable drag handle
  if (!open || items.length === 0) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        width: `${splitRatio * 100}%`,
        minWidth: MIN_PANEL_WIDTH,
        maxWidth: `${MAX_PANEL_PERCENT * 100}%`,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        // Smooth width changes when items are added/removed (not during drag)
        transition: isDragging.current ? 'none' : 'width 0.2s ease',
        willChange: 'width',
      }}
    >
      {/* Drag handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          width: DRAG_HANDLE_WIDTH,
          flexShrink: 0,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '&:hover .drag-indicator': {
            opacity: 1,
          },
          transition: 'background-color 0.15s',
          zIndex: 1,
        }}
      >
        <Box
          className="drag-indicator"
          sx={{
            width: 3,
            height: 40,
            borderRadius: 1,
            bgcolor: 'divider',
            opacity: 0.4,
            transition: 'opacity 0.15s',
          }}
        />
      </Box>

      {/* Panel content */}
      <Paper
        elevation={2}
        sx={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: 1,
          borderColor: 'divider',
        }}
      >
        {panelContent}
      </Paper>
    </Box>
  );
});

export default SidePanel;
