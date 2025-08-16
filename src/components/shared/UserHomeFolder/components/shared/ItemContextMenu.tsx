import React from 'react';
import { ItemContextMenuProps } from '../../types';

const ItemContextMenu: React.FC<ItemContextMenuProps> = ({
  anchorEl,
  item,
  onClose,
  onRenameFile,
  onDownloadFile,
  onMoveItem,
  onDeleteFile,
  onDeleteFolder,
  il8n,
  reactory
}) => {
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const {
    Menu,
    MenuItem,
    MenuList,
    ListItemIcon,
    ListItemText,
    Divider
  } = Material.MaterialCore;

  const {
    Edit,
    Download,
    DriveFileMove,
    Delete
  } = Material.MaterialIcons;

  const handleRename = () => {
    if (item && item.type === 'file') {
      onRenameFile((item as any).id, item.name);
    }
    onClose();
  };

  const handleDownload = () => {
    if (item && item.type === 'file') {
      onDownloadFile(item as any);
    }
    onClose();
  };

  const handleMove = () => {
    if (item) {
      onMoveItem(item, '/newpath'); // TODO: Add path selection dialog
    }
    onClose();
  };

  const handleDelete = () => {
    if (item) {
      if (item.type === 'file') {
        onDeleteFile((item as any).path);
      } else {
        onDeleteFolder(item.path);
      }
    }
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      // Render in a portal to avoid transform issues
      container={() => document.body}
      slotProps={{
        paper: {
          sx: {
            border: 1,
            borderColor: 'divider',
            boxShadow: 3
          }
        }
      }}
    >
      {item && (
        <MenuList dense>
          {item.type === 'file' && [
            <MenuItem key="rename" onClick={handleRename}>
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename' })}
              </ListItemText>
            </MenuItem>,
            <MenuItem key="download" onClick={handleDownload}>
              <ListItemIcon>
                <Download fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.files.download', { defaultValue: 'Download' })}
              </ListItemText>
            </MenuItem>,
            <MenuItem key="move" onClick={handleMove}>
              <ListItemIcon>
                <DriveFileMove fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.files.move', { defaultValue: 'Move' })}
              </ListItemText>
            </MenuItem>,
            <Divider key="divider1" />,
            <MenuItem key="delete" onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <Delete fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.files.delete', { defaultValue: 'Delete' })}
              </ListItemText>
            </MenuItem>
          ]}
          {item.type === 'folder' && [
            <MenuItem key="move-folder" onClick={handleMove}>
              <ListItemIcon>
                <DriveFileMove fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.folders.move', { defaultValue: 'Move' })}
              </ListItemText>
            </MenuItem>,
            <Divider key="divider2" />,
            <MenuItem key="delete-folder" onClick={handleDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <Delete fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>
                {il8n?.t('reactor.client.folders.delete', { defaultValue: 'Delete' })}
              </ListItemText>
            </MenuItem>
          ]}
        </MenuList>
      )}
    </Menu>
  );
};

export default ItemContextMenu;
