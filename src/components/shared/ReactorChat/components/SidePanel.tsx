import React from 'react';
import { SidePanelItem } from '../types';

const SIDEBAR_WIDTH = 380;

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
  // Only re-render when the item identity or props actually change
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
    Divider,
    Drawer,
    useMediaQuery,
    useTheme,
  } = Material.MaterialCore;

  const theme = useTheme();
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down('md'));

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
        width: isNarrowScreen ? '100%' : SIDEBAR_WIDTH,
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
        <>
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
        </>
      )}

      {/* Content area — each item is rendered in its own stable container */}
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

  // Narrow screen: use a Drawer
  if (isNarrowScreen) {
    return (
      <Drawer
        anchor="right"
        open={open && items.length > 0}
        onClose={onClose}
        PaperProps={{ sx: { width: '100%', maxWidth: 420 } }}
      >
        {panelContent}
      </Drawer>
    );
  }

  // Wide screen: inline docked panel
  if (!open || items.length === 0) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: 1,
        borderColor: 'divider',
        ml: 1,
      }}
    >
      {panelContent}
    </Paper>
  );
});

export default SidePanel;
