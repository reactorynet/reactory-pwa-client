import React from 'react';
import { IAIPersona } from '../types';

export interface ChatTransferDialogProps {
  open: boolean;
  /** All personas the user may hand the conversation to. */
  personas: IAIPersona[];
  /** The agent that currently owns the conversation — excluded from the list. */
  currentPersonaId?: string | null;
  /** The conversation being transferred, for display. */
  sourceTitle?: string;
  onClose: () => void;
  /** Perform the transfer. May throw — the dialog surfaces errors inline. */
  onTransfer: (personaId: string) => Promise<void> | void;
  Material: any;
  il8n?: any;
}

/**
 * Explicit "hand this conversation to another agent" affordance.
 *
 * Deliberately a confirm step rather than a side effect of selecting a history
 * row: opening another agent's conversation switches the active agent, whereas
 * transferring creates a new conversation for the target agent seeded with the
 * current one's context.
 */
const ChatTransferDialog: React.FC<ChatTransferDialogProps> = ({
  open,
  personas,
  currentPersonaId,
  sourceTitle,
  onClose,
  onTransfer,
  Material,
  il8n,
}) => {
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Box,
    Typography,
    Avatar,
    Button,
    List,
    ListItemButton,
    Alert,
    CircularProgress,
    Chip,
  } = Material.MaterialCore;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setBusy(false);
    setError('');
  }, [open]);

  const candidates = React.useMemo(
    () => (personas || []).filter((p: any) => p?.id && p.id !== currentPersonaId),
    [personas, currentPersonaId],
  );

  const handleConfirm = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    setError('');
    try {
      await onTransfer(selectedId);
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer the conversation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {il8n?.t('reactor.client.chat.transfer.title', {
          defaultValue: 'Transfer conversation to another agent',
        }) ?? 'Transfer conversation to another agent'}
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>
          {il8n?.t('reactor.client.chat.transfer.description', {
            defaultValue:
              'A new conversation is created for the agent you pick and seeded with the context of this one. This conversation is kept and linked as its parent.',
          }) ?? ''}
        </DialogContentText>

        {sourceTitle && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {il8n?.t('reactor.client.chat.transfer.from', { defaultValue: 'From' })}
            </Typography>
            <Chip label={sourceTitle} size="small" variant="outlined" />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {candidates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.chat.transfer.none', {
              defaultValue: 'There are no other agents available to transfer to.',
            })}
          </Typography>
        ) : (
          <List sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
            {candidates.map((persona: any) => (
              <ListItemButton
                key={persona.id}
                selected={selectedId === persona.id}
                onClick={() => setSelectedId(persona.id)}
                sx={{ borderRadius: 1, mb: 0.5, gap: 1.5 }}
              >
                <Avatar src={persona.avatar} alt={persona.name} sx={{ width: 32, height: 32 }}>
                  {persona.name?.charAt(0) || 'A'}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {persona.name || persona.id}
                  </Typography>
                  {persona.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {persona.description}
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedId || busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatTransferDialog;
