import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Collapse,
  Tooltip,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SendIcon from '@mui/icons-material/Send';
import BuildIcon from '@mui/icons-material/Build';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export type ToolApprovalDecision = 'approved' | 'declined' | 'instructed';

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
  onDecision: (decision: ToolApprovalDecision, instruction?: string) => void;
}

const ToolPrompt: React.FC<ToolPromptProps> = ({ toolName, args, onDecision }) => {
  const [decision, setDecision] = React.useState<ToolApprovalDecision | null>(null);
  const [showInstructField, setShowInstructField] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [showArgs, setShowArgs] = React.useState(true);
  const hasParams = args && Object.keys(args).length > 0;
  const displayName = camelCaseToWords(toolName) || toolName;

  const handleSubmitInstruction = () => {
    if (instruction.trim()) {
      setDecision('instructed');
      onDecision('instructed', instruction.trim());
    }
  };

  const actionBtnSx = (color: 'success' | 'warning' | 'error') => ({
    color: `${color}.main`,
    border: '1px solid',
    borderColor: `${color}.main`,
    bgcolor: 'transparent',
    '&:hover': {
      bgcolor: alpha(color === 'success' ? '#2e7d32' : color === 'error' ? '#d32f2f' : '#ed6c02', 0.12),
    },
  }) as const;

  return (
    <Box
      sx={{
        mt: 0.5,
        width: '100%',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: (t) => alpha(t.palette.warning.main, 0.06),
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.warning.main, 0.35),
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
        }}
      >
        <BuildIcon sx={{ fontSize: '0.95rem', color: 'warning.main' }} />
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.72rem',
            color: 'text.primary',
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'warning.main', fontStyle: 'italic', ml: 0.5, userSelect: 'none' }}
        >
          awaiting approval
        </Typography>
        <Box sx={{ flex: 1 }} />
        {hasParams && (
          <Tooltip title={showArgs ? 'Hide arguments' : 'Show arguments'}>
            <IconButton
              size="small"
              onClick={() => setShowArgs((p) => !p)}
              sx={{ p: 0.25, color: 'text.secondary' }}
              aria-label="toggle arguments"
            >
              {showArgs ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Args */}
      {hasParams && showArgs && (
        <Box
          sx={{
            px: 1,
            py: 0.5,
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          <Box
            component="pre"
            sx={{
              m: 0,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'text.secondary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {JSON.stringify(args, null, 2)}
          </Box>
        </Box>
      )}

      {/* Footer / actions */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {decision === null && (
          <>
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Tooltip title="Approve — execute this tool">
                <IconButton
                  size="small"
                  onClick={() => { setDecision('approved'); onDecision('approved'); }}
                  aria-label="Approve"
                  sx={actionBtnSx('success')}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Instruct — provide alternative guidance instead of running this tool">
                <IconButton
                  size="small"
                  onClick={() => setShowInstructField((prev) => !prev)}
                  aria-label="Instruct"
                  sx={actionBtnSx('warning')}
                >
                  <EditNoteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Decline — skip this tool">
                <IconButton
                  size="small"
                  onClick={() => { setDecision('declined'); onDecision('declined'); }}
                  aria-label="Decline"
                  sx={actionBtnSx('error')}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Collapse in={showInstructField}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end' }}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Tell the agent what to do instead..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitInstruction();
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': { fontSize: '0.8rem' },
                  }}
                />
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleSubmitInstruction}
                  disabled={!instruction.trim()}
                  aria-label="Send instruction"
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Collapse>
          </>
        )}
        {decision === 'approved' && (
          <Typography variant="caption" color="success.main" sx={{ textAlign: 'right', fontStyle: 'italic' }}>
            Approved
          </Typography>
        )}
        {decision === 'declined' && (
          <Typography variant="caption" color="error.main" sx={{ textAlign: 'right', fontStyle: 'italic' }}>
            Declined
          </Typography>
        )}
        {decision === 'instructed' && (
          <Typography variant="caption" color="warning.main" sx={{ textAlign: 'right', fontStyle: 'italic' }}>
            Instructed: {instruction}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ToolPrompt;
