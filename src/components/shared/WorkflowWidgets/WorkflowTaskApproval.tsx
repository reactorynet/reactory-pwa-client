import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export interface WorkflowTaskApprovalProps {
  task?: any;
  componentProps?: any;
  amount?: number;
  currency?: string;
  employee?: string;
  vendor?: string;
  category?: string;
  releaseTag?: string;
  annualValue?: number;
  onComplete?: (resultData: any) => Promise<any> | void;
  reactory?: any;
  // Chat tool execution approval props
  sessionId?: string;
  chatSessionId?: string;
  personaId?: string;
  persona?: any;
  iterationsCompleted?: number;
  maxIterations?: number;
  newMaxIterations?: number;
  title?: string;
  description?: string;
  pendingTools?: string[];
  onContinue?: (newMax?: number) => void;
  onStop?: () => void;
  [key: string]: any;
}

export const WorkflowTaskApproval: React.FC<WorkflowTaskApprovalProps> = (props) => {
  const {
    task,
    componentProps,
    onComplete,
    amount: propAmount,
    currency: propCurrency,
    employee: propEmployee,
    vendor: propVendor,
    category: propCategory,
    releaseTag: propReleaseTag,
    annualValue: propAnnualValue,
    iterationsCompleted: propIterationsCompleted,
    maxIterations: propMaxIterations,
    sessionId: propSessionId,
    chatSessionId: propChatSessionId,
    persona: propPersona,
    personaId: propPersonaId,
    pendingTools: propPendingTools,
    title: propTitle,
    description: propDescription,
    onContinue,
    onStop,
  } = props;

  const rawProps = componentProps || {};
  const isToolIterationApproval =
    propIterationsCompleted !== undefined ||
    rawProps.iterationsCompleted !== undefined ||
    task?.componentProps?.iterationsCompleted !== undefined ||
    task?.componentProps?.chatSessionId !== undefined ||
    rawProps.chatSessionId !== undefined ||
    propChatSessionId !== undefined;

  const amount = propAmount ?? rawProps.amount ?? task?.componentProps?.amount;
  const currency = propCurrency ?? rawProps.currency ?? task?.componentProps?.currency ?? 'USD';
  const employee = propEmployee ?? rawProps.employee ?? task?.componentProps?.employee;
  const vendor = propVendor ?? rawProps.vendor ?? task?.componentProps?.vendor;
  const category = propCategory ?? rawProps.category ?? task?.componentProps?.category;
  const releaseTag = propReleaseTag ?? rawProps.releaseTag ?? task?.componentProps?.releaseTag;
  const annualValue = propAnnualValue ?? rawProps.annualValue ?? task?.componentProps?.annualValue;

  const iterationsCompleted =
    propIterationsCompleted ??
    rawProps.iterationsCompleted ??
    task?.componentProps?.iterationsCompleted ??
    0;
  const maxIterations =
    propMaxIterations ??
    rawProps.maxIterations ??
    task?.componentProps?.maxIterations ??
    10;
  const sessionId =
    propSessionId ??
    propChatSessionId ??
    rawProps.sessionId ??
    rawProps.chatSessionId ??
    task?.instanceId ??
    task?.componentProps?.chatSessionId ??
    '';
  const persona =
    propPersona ??
    rawProps.persona ??
    task?.componentProps?.persona ??
    null;
  const pendingTools =
    propPendingTools ??
    rawProps.pendingTools ??
    task?.componentProps?.pendingTools ??
    [];
  const description =
    propDescription ??
    rawProps.description ??
    task?.description ??
    `The agent completed ${iterationsCompleted} of ${maxIterations} allowed tool calls and paused. You can approve additional iterations to continue.`;

  const [newMax, setNewMax] = useState<number>(Number(maxIterations) + 10);
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (onContinue) {
      onContinue(newMax !== maxIterations ? newMax : undefined);
    }
    if (!onComplete) return;
    try {
      setLoading(true);
      await onComplete({
        approved: true,
        decision: 'approved',
        newMaxIterations: newMax,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (onStop) {
      onStop();
    }
    if (!onComplete) {
      setRejectDialogOpen(false);
      return;
    }
    try {
      setLoading(true);
      await onComplete({
        approved: false,
        decision: 'rejected',
        reason: rejectionReason || 'Rejected by user',
        timestamp: new Date().toISOString(),
      });
      setRejectDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (isToolIterationApproval) {
    const personaName = persona?.name || 'Reactor Agent';
    const personaAvatar = persona?.avatar;
    const sessionDisplayId = sessionId ? `${String(sessionId).slice(0, 8)}...` : '';

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'rgba(255, 152, 0, 0.08)',
          border: '1px solid rgba(255, 152, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              src={personaAvatar}
              alt={personaName}
              sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}
            >
              {personaName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {personaName}
              </Typography>
              {sessionDisplayId && (
                <Typography variant="caption" color="text.secondary">
                  Session: {sessionDisplayId}
                </Typography>
              )}
            </Box>
          </Box>
          <Chip
            icon={<PauseCircleOutlineIcon fontSize="small" />}
            label="Tool Limit Reached"
            color="warning"
            size="small"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.primary' }}>
          {description}
        </Typography>

        {pendingTools && pendingTools.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Pending Tools:
            </Typography>
            {pendingTools.map((t: string, idx: number) => (
              <Chip
                key={idx}
                label={t}
                size="small"
                variant="outlined"
                color="secondary"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        )}

        <Grid container spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Completed Iterations</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {iterationsCompleted} / {maxIterations}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              type="number"
              size="small"
              label="New Limit"
              value={newMax}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1) setNewMax(val);
              }}
              inputProps={{ min: 1, max: 1000 }}
              sx={{ width: '100%', maxWidth: 130 }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={() => {
              if (onStop) {
                onStop();
              } else {
                setRejectDialogOpen(true);
              }
            }}
            disabled={loading}
          >
            Decline / Stop
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={handleApprove}
            disabled={loading}
          >
            Approve & Resume
          </Button>
        </Box>

        {/* Reject Reason Dialog */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Decline Tool Execution</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="Reason (Optional)"
              fullWidth
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Specify why tool execution was declined..."
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRejectConfirm} color="error" variant="contained">
              Confirm Decline
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUserIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Approval Required
          </Typography>
        </Box>
        <Chip label="Awaiting Approval" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>

      {task?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {task.description}
        </Typography>
      )}

      {/* Structured Details */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {amount !== undefined && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoneyIcon fontSize="small" />
              Amount
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
              {currency} {Number(amount).toLocaleString()}
            </Typography>
          </Grid>
        )}

        {annualValue !== undefined && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoneyIcon fontSize="small" />
              Annual Value
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
              {currency} {Number(annualValue).toLocaleString()}
            </Typography>
          </Grid>
        )}

        {employee && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon fontSize="small" />
              Requestor
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {employee}
            </Typography>
          </Grid>
        )}

        {vendor && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BusinessIcon fontSize="small" />
              Vendor
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {vendor}
            </Typography>
          </Grid>
        )}

        {category && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CategoryIcon fontSize="small" />
              Category
            </Typography>
            <Typography variant="body2">{category}</Typography>
          </Grid>
        )}

        {releaseTag && (
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Release Version</Typography>
            <Chip size="small" label={releaseTag} color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 1.5 }} />

      {/* Approval Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<CancelIcon />}
          onClick={() => setRejectDialogOpen(true)}
          disabled={loading}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
          onClick={handleApprove}
          disabled={loading}
        >
          Approve
        </Button>
      </Box>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reason for Rejection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Rejection Comments"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please specify why this request was declined..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRejectConfirm} color="error" variant="contained">
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default WorkflowTaskApproval;
