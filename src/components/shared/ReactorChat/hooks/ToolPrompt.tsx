import React from 'react';
import { Box, Typography, IconButton, TextField, Button, Collapse } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SendIcon from '@mui/icons-material/Send';

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
  const hasParams = args && Object.keys(args).length > 0;

  const handleSubmitInstruction = () => {
    if (instruction.trim()) {
      setDecision('instructed');
      onDecision('instructed', instruction.trim());
    }
  };

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
        {decision === null && (
          <>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <IconButton
                size="small"
                color="success"
                onClick={() => { setDecision('approved'); onDecision('approved'); }}
                aria-label="Approve"
                title="Approve — execute this tool"
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="warning"
                onClick={() => setShowInstructField((prev) => !prev)}
                aria-label="Instruct"
                title="Instruct — provide alternative guidance instead of running this tool"
              >
                <EditNoteIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => { setDecision('declined'); onDecision('declined'); }}
                aria-label="Decline"
                title="Decline — skip this tool"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>
            <Collapse in={showInstructField}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', px: 0.5, pb: 0.5 }}>
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
                  sx={{ fontSize: 13 }}
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
          <Typography variant="caption" color="success.main" sx={{ textAlign: 'right' }}>Approved</Typography>
        )}
        {decision === 'declined' && (
          <Typography variant="caption" color="error.main" sx={{ textAlign: 'right' }}>Declined</Typography>
        )}
        {decision === 'instructed' && (
          <Typography variant="caption" color="warning.main" sx={{ textAlign: 'right' }}>
            Instructed: {instruction}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ToolPrompt; 