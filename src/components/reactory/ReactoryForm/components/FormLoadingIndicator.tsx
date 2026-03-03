import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Fade,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircleOutline as CompleteIcon,
  RadioButtonUnchecked as PendingIcon,
  ErrorOutline as ErrorIcon,
  MoreHoriz as ActiveIcon,
} from '@mui/icons-material';
import { FormLoadingStage } from '../hooks/useFormLoadingState';

export interface FormLoadingIndicatorProps {
  /** All loading stages to display */
  stages: FormLoadingStage[];
  /** Overall progress 0-100 */
  progress: number;
  /** Label of the currently active stage */
  activeStageLabel: string;
  /** Whether loading has errored */
  hasError: boolean;
  /** 
   * Display variant:
   * - 'full': Shows progress bar + stage list + skeleton preview
   * - 'compact': Shows progress bar + active stage label only
   */
  variant?: 'full' | 'compact';
}

const stageIconMap: Record<FormLoadingStage['status'], React.ReactNode> = {
  pending: <PendingIcon sx={{ fontSize: 16, color: 'text.disabled' }} />,
  active: <ActiveIcon sx={{ fontSize: 16, color: 'primary.main', animation: 'pulse 1.4s ease-in-out infinite' }} />,
  complete: <CompleteIcon sx={{ fontSize: 16, color: 'success.main' }} />,
  error: <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />,
};

/**
 * Renders skeleton placeholders that hint at the shape of a form.
 */
const FormSkeleton: React.FC = () => {
  const theme = useTheme();
  return (
    <Box sx={{ mt: 2, px: 1 }}>
      {/* Title skeleton */}
      <Skeleton
        variant="text"
        width="40%"
        height={32}
        sx={{ mb: 1, borderRadius: 1 }}
      />
      {/* Field skeletons */}
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ mb: 2 }}>
          <Skeleton
            variant="text"
            width={`${20 + i * 8}%`}
            height={18}
            sx={{ mb: 0.5, borderRadius: 0.5 }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={40}
            sx={{
              borderRadius: 1,
              bgcolor: alpha(theme.palette.action.hover, 0.06),
            }}
          />
        </Box>
      ))}
      {/* Button skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Skeleton
          variant="rectangular"
          width={100}
          height={36}
          sx={{ borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
};

/**
 * Returns the appropriate text color for a loading stage status.
 */
const getStageColor = (
  status: FormLoadingStage['status']
): string => {
  if (status === 'error') return 'error';
  if (status === 'active') return 'primary';
  return 'text.secondary';
};

/**
 * Visual loading indicator for ReactoryForm that shows real-time
 * progress across discrete loading stages.
 */
export const FormLoadingIndicator: React.FC<FormLoadingIndicatorProps> = ({
  stages,
  progress,
  activeStageLabel,
  hasError,
  variant = 'full',
}) => {
  const theme = useTheme();

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          width: '100%',
          minHeight: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          py: 2,
          px: 1,
        }}
      >
        {/* Progress bar */}
        <Box sx={{ width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <Typography
              variant="body2"
              color={hasError ? 'error' : 'text.secondary'}
              sx={{ fontWeight: 500 }}
            >
              {activeStageLabel}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={hasError ? 'error' : 'primary'}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                transition: 'transform 0.4s ease',
              },
            }}
          />
        </Box>

        {/* Stage list — only in full variant */}
        {variant === 'full' && (
          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            {stages.map(stage => (
              <Box
                component="li"
                key={stage.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.25,
                  opacity: stage.status === 'pending' ? 0.5 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {stageIconMap[stage.status]}
                <Typography
                  variant="caption"
                  color={getStageColor(stage.status)}
                  sx={{
                    fontWeight: stage.status === 'active' ? 600 : 400,
                  }}
                >
                  {stage.label}
                  {stage.status === 'error' && stage.errorMessage
                    ? ` — ${stage.errorMessage}`
                    : ''}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Form skeleton preview — only in full variant */}
        {variant === 'full' && !hasError && <FormSkeleton />}

        {/* Pulse animation keyframes */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </Box>
    </Fade>
  );
};

export default FormLoadingIndicator;
