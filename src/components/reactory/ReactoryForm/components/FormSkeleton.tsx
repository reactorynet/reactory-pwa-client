/**
 * FormSkeleton
 * ------------
 * A theme-aware, animated placeholder that mimics the shape of a rendered
 * ReactoryForm (header, labelled field rows, optional two-column grid and a
 * footer toolbar).
 *
 * It is used in two places:
 *  1. As the standalone surface shown while a form definition has resolved but
 *     its real schema has not (replacing the old "Loading Form" placeholder
 *     that used to be rendered through the form engine).
 *  2. Inside `FormLoadingIndicator` (full variant) as the field preview.
 *
 * Design notes:
 *  - Skeleton geometry is deterministic (no Math.random) so the layout does not
 *    jitter between renders.
 *  - Colours are derived from the active MUI theme via `alpha()`, so it reads
 *    correctly in both light and dark modes.
 */

import React from 'react';
import { Box, Skeleton, Divider, useTheme, alpha, type SxProps, type Theme } from '@mui/material';

export interface FormSkeletonProps {
  /** Number of field rows to render. Default 4. */
  rows?: number;
  /** Fields per row. 1 = full width, 2 = two-column grid. Default 1. */
  columns?: 1 | 2;
  /** Render a header block (title + optional subtitle). Default true. */
  showHeader?: boolean;
  /** Render a section-label placeholder above the fields. Default false. */
  showSectionLabel?: boolean;
  /** Render a footer toolbar containing button placeholders. Default true. */
  showToolbar?: boolean;
  /** Compact spacing / smaller control heights. Default false. */
  dense?: boolean;
  /**
   * MUI Skeleton animation.
   * 'wave' | 'pulse' | false. Default 'wave'.
   */
  animation?: 'wave' | 'pulse' | false;
  /** Accessible label for the loading region. */
  label?: string;
  /** Extra styles applied to the container. */
  sx?: SxProps<Theme>;
}

/**
 * Deterministic label widths (percent) — cycled across fields so the skeleton
 * looks organic without being random.
 */
const LABEL_WIDTHS = [30, 24, 34, 26, 22, 32];

const CONTROL_HEIGHT = { normal: 44, dense: 36 } as const;
const FIELD_GAP = { normal: 2.5, dense: 1.75 } as const;

/**
 * A single field placeholder: a short label line above a control block.
 */
const FieldSkeleton: React.FC<{
  labelWidth: number;
  controlHeight: number;
  controlBg: string;
  animation: 'wave' | 'pulse' | false;
}> = ({ labelWidth, controlHeight, controlBg, animation }) => (
  <Box sx={{ width: '100%' }}>
    <Skeleton
      variant="text"
      animation={animation}
      width={`${labelWidth}%`}
      height={18}
      sx={{ mb: 0.75, borderRadius: 0.5 }}
    />
    <Skeleton
      variant="rounded"
      animation={animation}
      height={controlHeight}
      sx={{ borderRadius: 1, bgcolor: controlBg }}
    />
  </Box>
);

/**
 * A polished, reusable form-shaped loading skeleton.
 */
export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  rows = 4,
  columns = 1,
  showHeader = true,
  showSectionLabel = false,
  showToolbar = true,
  dense = false,
  animation = 'wave',
  label = 'Loading form',
  sx,
}) => {
  const theme = useTheme();

  const controlHeight = dense ? CONTROL_HEIGHT.dense : CONTROL_HEIGHT.normal;
  const fieldGap = dense ? FIELD_GAP.dense : FIELD_GAP.normal;

  // Subtle, theme-derived tints so the skeleton harmonises with the surface.
  const controlBg = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.06);
  const blockBg = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.05);

  const safeRows = Math.max(1, Math.floor(rows));
  const fieldCount = safeRows * columns;
  const rowCount = Math.ceil(fieldCount / columns);

  const renderRow = (rowIndex: number) => (
    <Box
      key={`row-${rowIndex}`}
      sx={{
        display: 'flex',
        flexDirection: columns === 2 ? { xs: 'column', sm: 'row' } : 'column',
        gap: fieldGap,
        mb: fieldGap,
      }}
    >
      {Array.from({ length: columns }).map((_, colIndex) => {
        const fieldIndex = rowIndex * columns + colIndex;
        const labelWidth = LABEL_WIDTHS[fieldIndex % LABEL_WIDTHS.length];
        return (
          <Box key={`field-${fieldIndex}`} sx={{ flex: 1, minWidth: 0 }}>
            <FieldSkeleton
              labelWidth={labelWidth}
              controlHeight={controlHeight}
              controlBg={controlBg}
              animation={animation}
            />
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      sx={{
        width: '100%',
        maxWidth: '100%',
        py: dense ? 1 : 2,
        px: dense ? 0.5 : 1,
        ...sx,
      }}
    >
      {showHeader && (
        <Box sx={{ mb: fieldGap }}>
          <Skeleton
            variant="text"
            animation={animation}
            width="42%"
            height={dense ? 26 : 30}
            sx={{ mb: 0.75, borderRadius: 0.5 }}
          />
          <Skeleton
            variant="text"
            animation={animation}
            width="64%"
            height={16}
            sx={{ borderRadius: 0.5 }}
          />
        </Box>
      )}

      {showSectionLabel && (
        <Skeleton
          variant="rounded"
          animation={animation}
          width={140}
          height={22}
          sx={{ borderRadius: 1, mb: fieldGap, bgcolor: blockBg }}
        />
      )}

      {Array.from({ length: rowCount }).map((_, rowIndex) => renderRow(rowIndex))}

      {showToolbar && (
        <Box sx={{ mt: dense ? 1 : 2 }}>
          <Divider sx={{ mb: dense ? 1.5 : 2 }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Skeleton
              variant="rounded"
              animation={animation}
              width={96}
              height={dense ? 32 : 38}
              sx={{ borderRadius: 1, bgcolor: blockBg }}
            />
            <Skeleton
              variant="rounded"
              animation={animation}
              width={110}
              height={dense ? 32 : 38}
              sx={{ borderRadius: 1, bgcolor: blockBg }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FormSkeleton;
