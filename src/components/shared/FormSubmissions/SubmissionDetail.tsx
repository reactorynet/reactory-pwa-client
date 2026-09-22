import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Grid,
  Icon,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useReactory } from '@reactory/client-core/api';

export interface SubmissionDetailSubmission {
  id: string;
  fqn: string;
  userId?: string;
  ipAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  formData?: Record<string, unknown>;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface SubmissionDetailProps {
  /** The row the panel was expanded from. */
  submission?: SubmissionDetailSubmission;
  /** Alias used when the table maps the raw row rather than the named prop. */
  rowData?: SubmissionDetailSubmission;
  /** The fqn of the form being explored. */
  fqn?: string;
  /** Supplied by the table widget so the list can be refreshed after a delete. */
  formContext?: { refresh?: () => void };
}

const DELETE_MUTATION = `mutation ReactoryFormSubmissionDelete($id: String!) {
  ReactoryFormSubmissionDelete(id: $id) {
    success
    message
  }
}`;

/**
 * The expanded view of a single submission.
 *
 * Field labels are taken from the *target* form's JSON schema where one is
 * available, so a submission reads the way the form that produced it reads
 * rather than as raw keys. When the schema has not been loaded (or the form has
 * since changed shape) it falls back to the key itself, which keeps old
 * submissions readable after a schema change.
 */
const SubmissionDetail: React.FC<SubmissionDetailProps> = (props) => {
  const reactory = useReactory();
  const submission = props.submission || props.rowData;
  const [tab, setTab] = useState<number>(0);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleted, setDeleted] = useState<boolean>(false);

  /**
   * The property titles declared by the form that produced the submission.
   * Resolved from the client's form cache - never fetched here, because the
   * panel renders inside a table row and must not fan out a request per row.
   */
  const titles = useMemo<Record<string, string>>(() => {
    const fqn = props.fqn || submission?.fqn;
    if (!fqn) return {};
    const definition = (reactory.formSchemas || []).find((form: any) => form.id === fqn);
    const schema = definition?.schema as any;
    const properties = schema?.properties;
    if (!properties || typeof properties !== 'object') return {};
    return Object.keys(properties).reduce((acc: Record<string, string>, key: string) => {
      const title = properties[key]?.title;
      if (title) acc[key] = title;
      return acc;
    }, {});
  }, [props.fqn, submission?.fqn, reactory.formSchemas]);

  const entries = useMemo(() => {
    const data = submission?.formData;
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).filter(([key]) => key.startsWith('__') === false);
  }, [submission]);

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <Typography variant="body2" color="text.secondary">—</Typography>;
    }
    if (typeof value === 'boolean') {
      return <Typography variant="body2">{value ? 'Yes' : 'No'}</Typography>;
    }
    if (typeof value === 'object') {
      return (
        <Typography
          variant="body2"
          component="pre"
          sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.78rem' }}
        >
          {JSON.stringify(value, null, 2)}
        </Typography>
      );
    }
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{String(value)}</Typography>;
  };

  const onDelete = useCallback(async () => {
    if (!submission?.id || deleting) return;
    setDeleting(true);
    try {
      const result = await reactory.graphqlMutation<any, any>(DELETE_MUTATION, { id: submission.id });
      const response = result?.data?.ReactoryFormSubmissionDelete;
      if (response?.success === true) {
        setDeleted(true);
        reactory.createNotification('Submission deleted', {
          type: 'success', showInAppNotification: true,
        });
        // The table owns the row set, so ask it to refetch rather than mutating
        // its state from here.
        props.formContext?.refresh?.();
      } else {
        reactory.createNotification(response?.message || 'The submission could not be deleted', {
          type: 'warning', showInAppNotification: true,
        });
      }
    } catch (deleteError) {
      reactory.error('Could not delete the submission', { deleteError });
      reactory.createNotification('The submission could not be deleted', {
        type: 'error', showInAppNotification: true,
      });
    } finally {
      setDeleting(false);
    }
  }, [submission?.id, deleting, reactory, props.formContext]);

  if (!submission) return null;

  const submitter = submission.user
    ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || submission.user.email
    : 'Anonymous';

  return (
    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'action.hover' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="subtitle2">{submitter}</Typography>
          <Typography variant="caption" color="text.secondary">
            {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}
            {submission.ipAddress ? ` · ${submission.ipAddress}` : ''}
            {` · ${submission.id}`}
          </Typography>
        </Box>
        <Button
          size="small"
          color="error"
          startIcon={<Icon>delete</Icon>}
          disabled={deleting || deleted}
          onClick={onDelete}
        >
          {deleted ? 'Deleted' : 'Delete'}
        </Button>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ minHeight: 36, mb: 1 }}>
        <Tab label="Fields" sx={{ minHeight: 36 }} />
        <Tab label="Raw JSON" sx={{ minHeight: 36 }} />
      </Tabs>

      {tab === 0 && (
        entries.length === 0
          ? <Typography variant="body2" color="text.secondary">This submission has no data.</Typography>
          : (
            <Grid container spacing={1}>
              {entries.map(([key, value]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {titles[key] || key}
                  </Typography>
                  {renderValue(value)}
                </Grid>
              ))}
            </Grid>
          )
      )}

      {tab === 1 && (
        <Typography
          variant="body2"
          component="pre"
          sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.78rem' }}
        >
          {JSON.stringify(submission.formData ?? {}, null, 2)}
        </Typography>
      )}
    </Paper>
  );
};

export default SubmissionDetail;
