import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Chip,
  Typography,
  Button,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

export interface TagItem {
  id: string;
  label: string;
  count?: number;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon?: React.ReactElement;
  disabled?: boolean;
}

export interface TagCloudProps {
  /** Array of tags as either string[] or TagItem[] */
  tags: (string | TagItem)[];
  /** Currently selected tag IDs (controlled) */
  selectedTags?: string[];
  /** Default selected tag IDs for uncontrolled mode */
  defaultSelectedTags?: string[];
  /** Callback fired when selection changes, returning the new array of selected tag IDs */
  onTagSelected?: (selectedTags: string[]) => void;
  /** RJSF-compatible change handler */
  onChange?: (selectedTags: string[]) => void;
  /** Allow multiple tags to be selected simultaneously. Default: true */
  multiple?: boolean;
  /** Chip size. Default: 'small' */
  size?: 'small' | 'medium';
  /** Unselected chip variant. Default: 'outlined' */
  variant?: 'outlined' | 'filled';
  /** Selected chip variant. Default: 'filled' */
  selectedVariant?: 'filled' | 'outlined';
  /** Unselected chip color. Default: 'default' */
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Selected chip color. Default: 'primary' */
  selectedColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Max tags to show before collapsing behind "+N more". 0 or undefined = show all. */
  maxDisplay?: number;
  /** Optional title or section label */
  label?: string;
  /** Whether to show tag counts. Default: true */
  showCounts?: boolean;
  /** Whether to show an "All" or "Clear" chip/action. Default: false */
  showClear?: boolean;
  /** Label for clear/all action. Default: 'All' */
  clearLabel?: string;
  /** Custom container sx props */
  sx?: any;
  /** Custom chip sx props */
  chipSx?: any;
  /** Injected Material module from Reactory (optional) */
  Material?: any;
  /** Localisation helper */
  il8n?: any;
}

/**
 * TagCloud Component
 *
 * Interactive, accessible tag cloud widget for multi-select or single-select
 * tag filtering. Supports raw string arrays or structured TagItems with counts,
 * expand/collapse thresholds, and clear actions.
 */
export const TagCloud: React.FC<TagCloudProps> = ({
  tags = [],
  selectedTags,
  defaultSelectedTags = [],
  onTagSelected,
  onChange,
  multiple = true,
  size = 'small',
  variant = 'outlined',
  selectedVariant = 'filled',
  color = 'default',
  selectedColor = 'primary',
  maxDisplay = 0,
  label,
  showCounts = true,
  showClear = false,
  clearLabel = 'All',
  sx = {},
  chipSx = {},
  Material,
  il8n,
}) => {
  // Use Material components if injected, otherwise direct MUI
  const BoxComp = Material?.MaterialCore?.Box || Box;
  const ChipComp = Material?.MaterialCore?.Chip || Chip;
  const TypographyComp = Material?.MaterialCore?.Typography || Typography;
  const ButtonComp = Material?.MaterialCore?.Button || Button;

  // Uncontrolled state fallback
  const [internalSelected, setInternalSelected] = useState<string[]>(defaultSelectedTags);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const currentSelected = selectedTags !== undefined ? selectedTags : internalSelected;

  // Normalise tags into TagItem[]
  const normalizedTags = useMemo<TagItem[]>(() => {
    if (!Array.isArray(tags)) return [];

    const itemMap = new Map<string, TagItem>();

    tags.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return;
        const existing = itemMap.get(trimmed);
        if (existing) {
          existing.count = (existing.count || 1) + 1;
        } else {
          itemMap.set(trimmed, { id: trimmed, label: trimmed, count: 1 });
        }
      } else if (typeof item === 'object') {
        const id = item.id || item.label;
        if (!id) return;
        const existing = itemMap.get(id);
        if (existing) {
          existing.count = (existing.count || 0) + (item.count || 1);
        } else {
          itemMap.set(id, { ...item, id, label: item.label || id });
        }
      }
    });

    return Array.from(itemMap.values());
  }, [tags]);

  // Check if counts should be shown (only if at least one tag has count > 1 or counts were explicit)
  const hasMeaningfulCounts = useMemo(() => {
    return normalizedTags.some((t) => t.count !== undefined && t.count > 1);
  }, [normalizedTags]);

  const handleTagClick = useCallback((tagId: string) => {
    let nextSelected: string[];

    if (multiple) {
      if (currentSelected.includes(tagId)) {
        nextSelected = currentSelected.filter((id) => id !== tagId);
      } else {
        nextSelected = [...currentSelected, tagId];
      }
    } else {
      nextSelected = currentSelected.includes(tagId) ? [] : [tagId];
    }

    if (selectedTags === undefined) {
      setInternalSelected(nextSelected);
    }
    onTagSelected?.(nextSelected);
    onChange?.(nextSelected);
  }, [multiple, currentSelected, selectedTags, onTagSelected, onChange]);

  const handleClear = useCallback(() => {
    if (selectedTags === undefined) {
      setInternalSelected([]);
    }
    onTagSelected?.([]);
    onChange?.([]);
  }, [selectedTags, onTagSelected, onChange]);

  if (normalizedTags.length === 0) {
    return null;
  }

  const shouldCollapse = maxDisplay > 0 && normalizedTags.length > maxDisplay;
  const visibleTags = shouldCollapse && !isExpanded
    ? normalizedTags.slice(0, maxDisplay)
    : normalizedTags;

  const hiddenCount = normalizedTags.length - maxDisplay;
  const isAllSelected = currentSelected.length === 0;

  return (
    <BoxComp
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        ...sx,
      }}
    >
      {label && (
        <BoxComp sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TypographyComp variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </TypographyComp>
          {currentSelected.length > 0 && (
            <ButtonComp
              size="small"
              onClick={handleClear}
              sx={{ minWidth: 0, p: 0, textTransform: 'none', fontSize: '0.75rem' }}
            >
              {il8n?.t?.('reactor.client.tagcloud.clear', { defaultValue: 'Clear' }) || 'Clear'}
            </ButtonComp>
          )}
        </BoxComp>
      )}

      <BoxComp
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        {showClear && (
          <ChipComp
            size={size}
            label={clearLabel}
            variant={isAllSelected ? selectedVariant : variant}
            color={isAllSelected ? selectedColor : color}
            onClick={handleClear}
            sx={{
              cursor: 'pointer',
              fontWeight: isAllSelected ? 600 : 400,
              transition: 'all 0.15s ease-in-out',
              ...chipSx,
            }}
          />
        )}

        {visibleTags.map((tag) => {
          const isSelected = currentSelected.includes(tag.id);
          const displayLabel = showCounts && hasMeaningfulCounts && tag.count !== undefined
            ? `${tag.label} (${tag.count})`
            : tag.label;

          return (
            <ChipComp
              key={tag.id}
              size={size}
              label={displayLabel}
              icon={isSelected ? <CheckIcon sx={{ fontSize: '1rem !important' }} /> : tag.icon}
              variant={isSelected ? selectedVariant : variant}
              color={isSelected ? selectedColor : (tag.color || color)}
              disabled={tag.disabled}
              onClick={() => handleTagClick(tag.id)}
              sx={{
                cursor: tag.disabled ? 'default' : 'pointer',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  opacity: 0.9,
                  transform: tag.disabled ? 'none' : 'translateY(-1px)',
                },
                ...chipSx,
              }}
            />
          );
        })}

        {shouldCollapse && (
          <ButtonComp
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              fontSize: '0.75rem',
              textTransform: 'none',
              py: 0.25,
              px: 1,
              minHeight: 24,
            }}
          >
            {isExpanded
              ? (il8n?.t?.('reactor.client.tagcloud.showLess', { defaultValue: 'Show less' }) || 'Show less')
              : (il8n?.t?.('reactor.client.tagcloud.showMore', { defaultValue: `+${hiddenCount} more` }) || `+${hiddenCount} more`)}
          </ButtonComp>
        )}
      </BoxComp>
    </BoxComp>
  );
};

export default TagCloud;
