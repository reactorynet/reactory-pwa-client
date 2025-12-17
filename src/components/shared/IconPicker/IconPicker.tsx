import React, { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Popover, 
  TextField, 
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, Apps as AppsIcon } from '@mui/icons-material';
import { debounce } from 'lodash';
import { IconPickerProps } from './types';
import { IconGrid } from './IconGrid';
import { useIconList } from './icons';
import { IconPickerRoot, SearchBar, GridContainer, IconPreview } from './IconPicker.styles';
import { useReactory } from '@reactory/client-core/api';
export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  label = 'Select Icon',
  variant = 'dialog',
  disabled = false,
  className,
  style,
  height = 400,
  width = '100%',
}) => {
  const { icons, loading } = useIconList();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const reactory = useReactory();
  // Filter icons based on search term
  const filteredIcons = useMemo(() => {
    if (!icons) return [];
    const allKeys = Object.keys(icons);
    if (!searchTerm) return allKeys;
    
    const lowerTerm = searchTerm.toLowerCase();
    return allKeys.filter(key => key.toLowerCase().includes(lowerTerm));
  }, [icons, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setIsOpen(true);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setIsOpen(false);
    setAnchorEl(null);
    setSearchTerm(''); // Optional: clear search on close
  };

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    if (variant !== 'inline') {
      handleClose();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Render content for the picker (Search + Grid)
  const renderPickerContent = (contentHeight: number | string, contentWidth: number | string) => (
    <IconPickerRoot style={{ width: contentWidth, height: contentHeight }}>
      <SearchBar>
        <SearchIcon color="action" />
        <TextField
          placeholder="Search icons..."
          variant="standard"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            disableUnderline: true,
          }}
        />
        {searchTerm && (
          <IconButton size="small" onClick={() => setSearchTerm('')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </SearchBar>
      
      <GridContainer style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <CircularProgress style={{ margin: 'auto', display: 'block', marginTop: 20 }} />
        ) : (
          <IconGrid 
            icons={filteredIcons} 
            iconMap={icons}
            selectedIcon={value} 
            onSelect={handleSelect} 
          />
        )}
      </GridContainer>
    </IconPickerRoot>
  );

  const SelectedIconComponent = value && icons && icons[value] ? icons[value] : null;

  // Render the input trigger
  const renderTrigger = () => (
    <div className={className} style={style}>
      {variant === 'inline' ? null : (
        <TextField
            label={label}
            value={value || ''}
            onClick={handleOpen}
            disabled={disabled}
            variant={(reactory?.muiTheme?.MaterialTextField as any)?.variant || 'standard'}
            fullWidth
            InputProps={{
                readOnly: true,
                startAdornment: (
                    <InputAdornment position="start">
                        {SelectedIconComponent ? <SelectedIconComponent /> : <AppsIcon color="disabled" />}
                    </InputAdornment>
                ),
                endAdornment: value ? (
                    <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClear} disabled={disabled}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </InputAdornment>
                ) : null,
                style: { cursor: disabled ? 'default' : 'pointer' }
            }}
        />
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={className} style={{ ...style, height: style?.height || height, width: style?.width || width, border: '1px solid #ddd' }}>
        {renderPickerContent('100%', '100%')}
      </div>
    );
  }

  return (
    <>
      {renderTrigger()}
      
      {variant === 'dialog' && (
        <Dialog 
            open={isOpen} 
            onClose={handleClose} 
            maxWidth="md" 
            fullWidth
            scroll="paper"
        >
          <DialogTitle>Select Icon</DialogTitle>
          <DialogContent dividers style={{ height: 500, padding: 0, overflow: 'hidden' }}>
            {renderPickerContent(400, 400)}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
          </DialogActions>
        </Dialog>
      )}

      {variant === 'popover' && (
        <Popover
          open={isOpen}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
              style: { width: 400, height: 400 }
          }}
        >
          {renderPickerContent(400, 400)}
        </Popover>
      )}
    </>
  );
};

export default IconPicker;
