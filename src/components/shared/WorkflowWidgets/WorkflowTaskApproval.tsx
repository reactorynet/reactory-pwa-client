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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

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
  } = props;

  const rawProps = componentProps || {};
  const amount = propAmount ?? rawProps.amount ?? task?.componentProps?.amount;
  const currency = propCurrency ?? rawProps.currency ?? task?.componentProps?.currency ?? 'USD';
  const employee = propEmployee ?? rawProps.employee ?? task?.componentProps?.employee;
  const vendor = propVendor ?? rawProps.vendor ?? task?.componentProps?.vendor;
  const category = propCategory ?? rawProps.category ?? task?.componentProps?.category;
  const releaseTag = propReleaseTag ?? rawProps.releaseTag ?? task?.componentProps?.releaseTag;
  const annualValue = propAnnualValue ?? rawProps.annualValue ?? task?.componentProps?.annualValue;

  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (!onComplete) return;
    try {
      setLoading(true);
      await onComplete({
        approved: true,
        decision: 'approved',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!onComplete) return;
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
