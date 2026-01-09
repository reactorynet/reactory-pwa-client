import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Grid, CellComponentProps } from 'react-window';
import { Typography, Tooltip } from '@mui/material';
import { IconItem } from './IconPicker.styles';
import { IconGridProps } from './types';

const ITEM_SIZE = 80; // Width/Height of each grid cell

interface CellProps {
  icons: any;
  iconKeys: string[];
  columnCount: number;
  onSelect: (icon: string) => void;
  selectedIcon?: string;
}

// Combine react-window injected props with our custom props
type Props = CellComponentProps<CellProps> & CellProps;

const Cell = ({ columnIndex, rowIndex, style, icons, iconKeys, columnCount, onSelect, selectedIcon }: Props) => {
  const index = rowIndex * columnCount + columnIndex;

  if (index >= iconKeys.length) {
    return null;
  }

  const iconName = iconKeys[index];
  const IconComponent = icons[iconName];
  const isSelected = selectedIcon === iconName;

  if (!IconComponent) {
     return null;
  }

  return (
    <div style={style}>
        <Tooltip title={iconName} arrow placement="top">
            <IconItem
                selected={isSelected}
                onClick={() => onSelect(iconName)}
            >
                <IconComponent fontSize="large" color={isSelected ? "primary" : "inherit"} />
                <Typography variant="caption" noWrap style={{ maxWidth: '100%', marginTop: 4, fontSize: '0.7rem', color: 'inherit' }}>
                    {iconName}
                </Typography>
            </IconItem>
        </Tooltip>
    </div>
  );
};

export const IconGrid: React.FC<IconGridProps & { iconMap: any }> = ({ 
  icons: iconKeys, 
  iconMap,
  selectedIcon, 
  onSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { width, height } = dimensions;
  const columnCount = Math.floor(width / ITEM_SIZE);
  const rowCount = Math.ceil(iconKeys.length / columnCount);

  if (columnCount === 0) return null;

  return (
    <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Grid
        columnCount={columnCount}
        columnWidth={width / columnCount}
        rowCount={rowCount}
        rowHeight={ITEM_SIZE}
        style={{ width, height }}
        cellComponent={Cell}
        cellProps={{
          icons: iconMap,
          iconKeys,
          columnCount,
          onSelect,
          selectedIcon,
        }}
      />
    </div>
  );
};
