import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

function camelCaseToWords(name: string) {
  if (!name) return '';
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

interface ToolPromptProps {
  toolName: string;
  args: Record<string, any>;
  onDecision: (approved: boolean) => void;
}

const ToolPrompt: React.FC<ToolPromptProps> = ({ toolName, args, onDecision }) => {
  const [decision, setDecision] = React.useState<null | boolean>(null);
  const hasParams = args && Object.keys(args).length > 0;
  return (
    <Box sx={{
      p: 0,
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper',
      minWidth: 220,
    }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {camelCaseToWords(toolName)}
      </Typography>
      {hasParams && (
        <Box sx={{ 
          mb: 1, 
          fontFamily: 'monospace', 
          fontSize: 13, 
          px: 1, 
          py: 0.5, 
          bgcolor: 'grey.900', 
          borderRadius: 1, 
          color: 'grey.100',
          maxHeight: 200,
          overflow: 'auto',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}>
            {JSON.stringify(args, null, 2)}
          </pre>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
        {decision === null && (
          <>
            <IconButton
              size="small"
              color="success"
              onClick={() => { setDecision(true); onDecision(true); }}
              aria-label="Approve"
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => { setDecision(false); onDecision(false); }}
              aria-label="Decline"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </>
        )}
        {decision === true && (
          <Typography variant="caption" color="success.main">Approved</Typography>
        )}
        {decision === false && (
          <Typography variant="caption" color="error.main">Declined</Typography>
        )}
      </Box>
    </Box>
  );
};

export default ToolPrompt; 