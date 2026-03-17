import React, { useState } from 'react';

interface ToolIterationLimitBannerProps {
  iterationsCompleted: number;
  maxIterations: number;
  onContinue: (newMaxIterations?: number) => void;
  onStop: () => void;
  Material: any;
  il8n: any;
}

const ToolIterationLimitBanner: React.FC<ToolIterationLimitBannerProps> = ({
  iterationsCompleted,
  maxIterations,
  onContinue,
  onStop,
  Material,
  il8n,
}) => {
  const [newMax, setNewMax] = useState<number>(maxIterations);

  const {
    Box,
    Typography,
    Button,
    TextField,
    Icon,
  } = Material.MaterialCore;

  return (
    <Box
      sx={{
        p: 2,
        mx: 2,
        mb: 1,
        bgcolor: 'warning.light',
        color: 'warning.contrastText',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ color: 'warning.contrastText' }}>pause_circle</Icon>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.tools.iterationLimit.title', {
            defaultValue: 'Tool Iteration Limit Reached',
          })}
        </Typography>
      </Box>
      <Typography variant="body2">
        {il8n?.t('reactor.client.tools.iterationLimit.description', {
          defaultValue: `The agent completed {{completed}} of {{max}} allowed tool calls and paused. You can continue with the same or a different limit.`,
          completed: iterationsCompleted,
          max: maxIterations,
        })}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
        <TextField
          type="number"
          size="small"
          label={il8n?.t('reactor.client.tools.iterationLimit.newLimit', {
            defaultValue: 'New limit',
          })}
          value={newMax}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val >= 1) setNewMax(val);
          }}
          inputProps={{ min: 1, max: 1000 }}
          sx={{ width: 120 }}
        />
        <Button
          variant="contained"
          size="small"
          color="primary"
          startIcon={<Icon>play_arrow</Icon>}
          onClick={() => onContinue(newMax !== maxIterations ? newMax : undefined)}
        >
          {il8n?.t('reactor.client.tools.iterationLimit.continue', {
            defaultValue: 'Continue',
          })}
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="inherit"
          startIcon={<Icon>stop</Icon>}
          onClick={onStop}
        >
          {il8n?.t('reactor.client.tools.iterationLimit.stop', {
            defaultValue: 'Stop',
          })}
        </Button>
      </Box>
    </Box>
  );
};

export default ToolIterationLimitBanner;
