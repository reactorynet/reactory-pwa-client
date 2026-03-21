import React from 'react';
import { gql } from '@apollo/client';
import { ChatState } from '../../types';
import useDesktopEnvironment from '../../hooks/useDesktopEnvironment';

export type DockSide = 'left' | 'right';

export interface FileExplorerSidebarProps {
  open: boolean;
  dock: DockSide;
  onDockChange: (dock: DockSide) => void;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  chatState?: ChatState;
  /** Pin an existing cataloged file (or desktop reference when referenceOnly). */
  onPinFile?: (
    fileId: string,
    path: string,
    options?: { referenceOnly?: boolean },
  ) => Promise<void>;
  onUnpinFile?: (fileId: string, path: string) => Promise<void>;
  onPinFolder?: (path: string, name: string) => Promise<void>;
  onUnpinFolder?: (path: string, name: string) => Promise<void>;
  il8n: any;
}

interface TreeFolder {
  name: string;
  path: string;
  loaded: boolean;
  children: TreeFolder[];
  files: TreeFile[];
}

interface TreeFile {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  created: string;
}

const GET_PATH_CONTENTS = gql`
  query ReactoryUserFiles($path: String, $loadOptions: ReactoryUserFilesLoadOptionsInput) {
    ReactoryUserFiles(path: $path, loadOptions: $loadOptions) {
      ... on ReactoryUserFiles {
        path
        folders {
          name
          path
        }
        files {
          id
          filename
          mimetype
          size
          path
          created
          link
          alias
        }
      }
      ... on ReactoryUserFilesErrorResponse {
        error
        message
      }
    }
  }
`;

const SIDEBAR_WIDTH = 320;

function fileIdString(f: Reactory.Models.IReactoryFile): string {
  const id = (f as any).id ?? (f as any)._id;
  return id != null ? String(id) : '';
}

const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
  open,
  dock,
  onDockChange,
  onClose,
  reactory,
  chatState,
  onPinFile,
  onUnpinFile,
  onPinFolder,
  onUnpinFolder,
  il8n,
}) => {
  const {
    Material,
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule;
  }>(["material-ui.Material"]);

  const {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    Drawer,
    CircularProgress,
    Collapse,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Chip,
  } = Material.MaterialCore;

  const {
    Close,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
    Folder,
    ExpandMore,
    ExpandLess,
    InsertDriveFile,
    Image,
    PictureAsPdf,
    Description,
    Code,
    Refresh,
    PushPin,
    PushPinOutlined,
    Visibility,
    VisibilityOff,
  } = Material.MaterialIcons;

  const [tree, setTree] = React.useState<TreeFolder>({
    name: '/',
    path: '/',
    loaded: false,
    children: [],
    files: [],
  });
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(['/']));
  const [loadingPaths, setLoadingPaths] = React.useState<Set<string>>(new Set());
  const [pinningKey, setPinningKey] = React.useState<string | null>(null);
  const [showHidden, setShowHidden] = React.useState(false);

  const isNarrowScreen = React.useMemo(() => {
    const width = window.innerWidth || document.documentElement.clientWidth;
    return width < 900;
  }, []);

  const desktopEnv = useDesktopEnvironment();

  const loadOptions = React.useMemo(
    () => ({ includeHidden: showHidden }),
    [showHidden],
  );

  const loadPath = React.useCallback(async (path: string) => {
    setLoadingPaths(prev => new Set(prev).add(path));
    try {
      const response = await reactory.graphqlQuery<{
        ReactoryUserFiles: {
          path: string;
          folders: { name: string; path: string }[];
          files: {
            id: string;
            filename: string;
            mimetype: string;
            size: number;
            path: string;
            created: string;
            link: string;
            alias: string;
          }[];
        } | { error: string; message: string };
      }, { path: string; loadOptions: { includeHidden: boolean } }>(GET_PATH_CONTENTS, { path, loadOptions });

      const data = response?.data?.ReactoryUserFiles;
      if (!data || 'error' in data) return;

      const childFolders: TreeFolder[] = (data.folders || []).map(f => ({
        name: f.name,
        path: f.path,
        loaded: false,
        children: [],
        files: [],
      }));

      const childFiles: TreeFile[] = (data.files || []).map(f => ({
        id: f.id,
        name: f.filename || f.alias || 'Unknown',
        mimetype: f.mimetype,
        size: f.size,
        path: f.path,
        url: f.link,
        created: f.created,
      }));

      setTree(prev => insertAtPath(prev, path, childFolders, childFiles));
    } catch (err) {
      reactory.error('FileExplorerSidebar: failed to load path', err);
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, [reactory, loadOptions]);

  const insertAtPath = (
    node: TreeFolder,
    targetPath: string,
    folders: TreeFolder[],
    files: TreeFile[],
  ): TreeFolder => {
    if (node.path === targetPath) {
      return { ...node, loaded: true, children: folders, files };
    }
    return {
      ...node,
      children: node.children.map(child => insertAtPath(child, targetPath, folders, files)),
    };
  };

  React.useEffect(() => {
    if (!open) return;
    setTree({ name: '/', path: '/', loaded: false, children: [], files: [] });
    setExpanded(new Set(['/']));
    loadPath('/');
  }, [open, showHidden, loadPath]);

  const handleToggleFolder = React.useCallback((path: string, loaded: boolean) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    if (!loaded) {
      loadPath(path);
    }
  }, [loadPath]);

  const handleRefresh = React.useCallback(() => {
    setTree({ name: '/', path: '/', loaded: false, children: [], files: [] });
    setExpanded(new Set(['/']));
    loadPath('/');
  }, [loadPath]);

  const pinnedFileIds = React.useMemo(() => {
    const files = chatState?.files || [];
    const set = new Set<string>();
    for (const f of files) {
      const id = fileIdString(f);
      if (id) set.add(id);
    }
    return set;
  }, [chatState?.files]);

  const pinnedFilePaths = React.useMemo(() => {
    const files = chatState?.files || [];
    const set = new Set<string>();
    for (const f of files) {
      const p = (f as any)?.path;
      if (p) set.add(String(p));
    }
    return set;
  }, [chatState?.files]);

  const pinnedFolderPaths = React.useMemo(() => {
    const folders = chatState?.folders || [];
    return new Set(folders.map(f => f.path));
  }, [chatState?.folders]);

  const isFilePinned = React.useCallback(
    (file: TreeFile) =>
      pinnedFileIds.has(file.id) ||
      (!!file.path && pinnedFilePaths.has(file.path)),
    [pinnedFileIds, pinnedFilePaths],
  );

  const isFolderPinned = React.useCallback(
    (folderPath: string) => pinnedFolderPaths.has(folderPath),
    [pinnedFolderPaths],
  );

  const sessionFileIdForUnpin = React.useCallback(
    (file: TreeFile) => {
      const files = chatState?.files || [];
      if (pinnedFileIds.has(file.id)) return file.id;
      const byPath = files.find(
        (f) => (f as any)?.path && String((f as any).path) === file.path,
      );
      return byPath ? fileIdString(byPath) : file.id;
    },
    [chatState?.files, pinnedFileIds],
  );

  const handlePinToggleFile = React.useCallback(
    async (e: React.MouseEvent, file: TreeFile) => {
      e.stopPropagation();
      const pinned = isFilePinned(file);
      const key = `f:${file.id}`;
      setPinningKey(key);
      try {
        if (pinned) {
          await onUnpinFile?.(sessionFileIdForUnpin(file), file.path);
        } else {
          const referenceOnly = desktopEnv.isDesktop;
          await onPinFile?.(file.id, file.path, referenceOnly ? { referenceOnly: true } : undefined);
        }
      } catch (err) {
        reactory.error('FileExplorerSidebar: pin/unpin file failed', err);
      } finally {
        setPinningKey(null);
      }
    },
    [desktopEnv.isDesktop, isFilePinned, onPinFile, onUnpinFile, reactory, sessionFileIdForUnpin],
  );

  const handlePinToggleFolder = React.useCallback(
    async (e: React.MouseEvent, folder: TreeFolder) => {
      e.stopPropagation();
      const pinned = isFolderPinned(folder.path);
      const key = `d:${folder.path}`;
      setPinningKey(key);
      try {
        if (pinned) {
          await onUnpinFolder?.(folder.path, folder.name);
        } else {
          await onPinFolder?.(folder.path, folder.name);
        }
      } catch (err) {
        reactory.error('FileExplorerSidebar: pin/unpin folder failed', err);
      } finally {
        setPinningKey(null);
      }
    },
    [isFolderPinned, onPinFolder, onUnpinFolder, reactory],
  );

  const getFileIcon = React.useCallback((mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image sx={{ fontSize: 16 }} />;
    if (mimetype === 'application/pdf') return <PictureAsPdf sx={{ fontSize: 16 }} />;
    if (mimetype.startsWith('text/') || mimetype.includes('document')) return <Description sx={{ fontSize: 16 }} />;
    if (mimetype.includes('json') || mimetype.includes('javascript') || mimetype.includes('code'))
      return <Code sx={{ fontSize: 16 }} />;
    return <InsertDriveFile sx={{ fontSize: 16 }} />;
  }, [Image, PictureAsPdf, Description, Code, InsertDriveFile]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFolder = (folder: TreeFolder, depth: number = 0) => {
    const isExpanded = expanded.has(folder.path);
    const isLoading = loadingPaths.has(folder.path);
    const folderPinned = isFolderPinned(folder.path);
    const folderPinBusy = pinningKey === `d:${folder.path}`;

    return (
      <React.Fragment key={folder.path}>
        <ListItemButton
          onClick={() => handleToggleFolder(folder.path, folder.loaded)}
          sx={{
            pl: 1.5 + depth * 2,
            py: 0.25,
            minHeight: 32,
          }}
          dense
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            {isLoading ? (
              <CircularProgress size={14} />
            ) : isExpanded ? (
              <FolderOpen sx={{ fontSize: 18, color: 'warning.main' }} />
            ) : (
              <Folder sx={{ fontSize: 18, color: 'warning.main' }} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={folder.name === '/' ? 'Home' : folder.name}
            primaryTypographyProps={{
              variant: 'body2',
              fontSize: '0.8rem',
              noWrap: true,
              fontWeight: isExpanded ? 600 : 400,
            }}
          />
          {(onPinFolder || onUnpinFolder) && (
            <Tooltip
              title={
                folderPinned
                  ? il8n?.t('reactor.client.fileExplorer.unpinFolder', { defaultValue: 'Unpin folder' })
                  : il8n?.t('reactor.client.fileExplorer.pinFolder', { defaultValue: 'Pin folder to chat' })
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={folderPinBusy}
                  onClick={e => handlePinToggleFolder(e, folder)}
                  sx={{ ml: 0.5 }}
                >
                  {folderPinBusy ? (
                    <CircularProgress size={14} />
                  ) : folderPinned ? (
                    <PushPin sx={{ fontSize: 16 }} color="primary" />
                  ) : (
                    <PushPinOutlined sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
        </ListItemButton>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {folder.children.map(child => renderFolder(child, depth + 1))}
            {folder.files.map(file => renderFile(file, depth + 1))}
            {folder.loaded && folder.children.length === 0 && folder.files.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ pl: 3.5 + depth * 2, py: 0.5, display: 'block', fontStyle: 'italic', fontSize: '0.7rem' }}
              >
                Empty folder
              </Typography>
            )}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };

  const renderFile = (file: TreeFile, depth: number) => {
    const pinned = isFilePinned(file);
    const busy = pinningKey === `f:${file.id}`;

    return (
      <ListItemButton
        key={file.id}
        sx={{
          pl: 1.5 + depth * 2,
          py: 0.25,
          minHeight: 32,
        }}
        dense
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          {busy ? <CircularProgress size={14} /> : getFileIcon(file.mimetype)}
        </ListItemIcon>
        <ListItemText
          primary={file.name}
          secondary={formatSize(file.size)}
          primaryTypographyProps={{
            variant: 'body2',
            fontSize: '0.75rem',
            noWrap: true,
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            fontSize: '0.65rem',
          }}
        />
        {(onPinFile || onUnpinFile) && (
          <Tooltip
            title={
              pinned
                ? il8n?.t('reactor.client.fileExplorer.unpinFile', { defaultValue: 'Unpin from chat' })
                : il8n?.t('reactor.client.fileExplorer.pinFile', { defaultValue: 'Pin to chat' })
            }
          >
            <span>
              <IconButton
                size="small"
                disabled={busy}
                onClick={e => handlePinToggleFile(e, file)}
                sx={{ ml: 0.5 }}
              >
                {pinned ? (
                  <PushPin sx={{ fontSize: 16 }} color="primary" />
                ) : (
                  <PushPinOutlined sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </ListItemButton>
    );
  };

  const dockToggleIcon = dock === 'right'
    ? <ChevronLeft fontSize="small" />
    : <ChevronRight fontSize="small" />;
  const dockToggleTitle = dock === 'right'
    ? il8n?.t('reactor.client.fileExplorer.dockLeft', { defaultValue: 'Dock to left' })
    : il8n?.t('reactor.client.fileExplorer.dockRight', { defaultValue: 'Dock to right' });

  const fileCount = React.useMemo(() => {
    const count = (node: TreeFolder): number =>
      node.files.length + node.children.reduce((acc, c) => acc + count(c), 0);
    return count(tree);
  }, [tree]);

  const sidebarContent = (
    <Box
      sx={{
        width: isNarrowScreen ? '85vw' : SIDEBAR_WIDTH,
        maxWidth: isNarrowScreen ? 400 : undefined,
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
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          gap: 0.5,
        }}
      >
        <FolderOpen sx={{ fontSize: 18 }} color="primary" />
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, fontSize: '0.85rem' }}>
          {il8n?.t('reactor.client.fileExplorer.title', { defaultValue: 'My Files' })} {desktopEnv.isDesktop ? '(Local)' : '(Cloud)'}
        </Typography>
        {fileCount > 0 && (
          <Chip label={fileCount} size="small" color="default" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
        <Tooltip
          title={
            showHidden
              ? il8n?.t('reactor.client.fileExplorer.hideHidden', { defaultValue: 'Hide hidden files' })
              : il8n?.t('reactor.client.fileExplorer.showHidden', { defaultValue: 'Show hidden files' })
          }
        >
          <IconButton size="small" onClick={() => setShowHidden(h => !h)}>
            {showHidden ? <Visibility sx={{ fontSize: 16 }} /> : <VisibilityOff sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={il8n?.t('reactor.client.fileExplorer.refresh', { defaultValue: 'Refresh' })}>
          <IconButton size="small" onClick={handleRefresh}>
            <Refresh sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        {!isNarrowScreen && (
          <Tooltip title={dockToggleTitle}>
            <IconButton
              size="small"
              onClick={() => onDockChange(dock === 'right' ? 'left' : 'right')}
              aria-label={dockToggleTitle}
            >
              {dockToggleIcon}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={il8n?.t('reactor.client.fileExplorer.close', { defaultValue: 'Close' })}>
          <IconButton size="small" onClick={onClose}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tree */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List disablePadding dense>
          {renderFolder(tree, 0)}
        </List>
      </Box>

      {/* Hint */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderTop: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {il8n?.t('reactor.client.fileExplorer.hintPin', {
            defaultValue: 'Use the pin to add files or folders to this chat for the agent. Desktop pins use local references without re-uploading.',
          })}
        </Typography>
      </Box>
    </Box>
  );

  if (isNarrowScreen) {
    return (
      <Drawer
        anchor={dock}
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: '85vw', maxWidth: 400 } }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Paper
      elevation={2}
      square
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        borderLeft: dock === 'right' ? '1px solid' : 'none',
        borderRight: dock === 'left' ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      {sidebarContent}
    </Paper>
  );
};

export default FileExplorerSidebar;
