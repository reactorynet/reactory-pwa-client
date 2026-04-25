import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import CircleIcon from '@mui/icons-material/FiberManualRecord';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RichEditor from '@reactory/client-core/components/reactory/ux/mui/widgets/RichEditor';
import { FileHandle, FileProps } from './types';
import useFileSession from './hooks/useFileSession';
import useSaveShortcut from './hooks/useSaveShortcut';
import { formatFromExtension } from './utils';

const CONNECTION_LABEL: Record<string, string> = {
  idle: 'idle',
  connecting: 'connecting…',
  connected: 'connected',
  reconnecting: 'reconnecting…',
  offline: 'offline',
  expired: 'expired',
};

const CONNECTION_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  idle: 'default',
  connecting: 'warning',
  connected: 'success',
  reconnecting: 'warning',
  offline: 'error',
  expired: 'error',
};

function tailPath(p: string, max = 48): string {
  if (p.length <= max) return p;
  return `…${p.slice(-(max - 1))}`;
}

/**
 * `<File />` — minimal live editor for a single text file.
 * See SPEC.md for the full contract. Composes `useFileSession` +
 * `useSaveShortcut` around a `RichEditor`.
 */
const File = React.forwardRef<FileHandle, FileProps>((props, ref) => {
  const {
    path,
    scope = 'server',
    format: formatOverride,
    readOnly: readOnlyProp,
    height,
    onChange,
    onSave,
    onSaved,
    onSaveError,
    onExternalChange,
  } = props;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const session = useFileSession({
    path,
    scope,
    onSave,
    onSaved,
    onSaveError,
    onExternalChange,
  });

  const format = formatOverride ?? formatFromExtension(path);
  const effectiveReadOnly = Boolean(
    readOnlyProp ||
    session.readOnlyReason === 'loading' ||
    session.readOnlyReason === 'permission-denied' ||
    session.readOnlyReason === 'deleted' ||
    session.readOnlyReason === 'session-error',
  );

  // Propagate buffer changes upward.
  React.useEffect(() => {
    onChange?.(session.content, { dirty: session.dirty });
    // onChange ref lives in parent; session.dirty already reflects buffer state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.content, session.dirty]);

  useSaveShortcut(containerRef, {
    enabled: !effectiveReadOnly,
    onSave: () => { void session.save(); },
    onReload: () => { void session.reload(); },
  });

  React.useImperativeHandle(ref, () => ({
    save: session.save,
    reload: session.reload,
    getContent: () => session.content,
    isDirty: () => session.dirty,
    focus: () => {
      const editor = containerRef.current?.querySelector<HTMLElement>('.ql-editor');
      editor?.focus();
    },
  }), [session]);

  return (
    <Box
      ref={containerRef}
      // tabIndex makes the container focusable so keydown bubbles from children
      tabIndex={-1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: height ?? '100%',
        minHeight: 0,
        outline: 'none',
      }}
      aria-label={`File editor: ${path}`}
      role="group"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.5,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontFamily: 'monospace' }} noWrap title={path}>
          {tailPath(path)}
        </Typography>
        <Chip size="small" label={format} variant="outlined" />
        {session.dirty && (
          <CircleIcon sx={{ fontSize: 10, color: theme => theme.palette.warning.main }} aria-label="unsaved changes" />
        )}
        <Chip
          size="small"
          label={CONNECTION_LABEL[session.connectionState]}
          color={CONNECTION_COLOR[session.connectionState]}
          variant={session.connectionState === 'connected' ? 'filled' : 'outlined'}
          aria-live="polite"
        />
      </Box>

      {session.readOnlyMessage && (
        <Box
          role="alert"
          sx={{
            px: 1,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: theme => theme.palette.warning.light,
            color: theme => theme.palette.warning.contrastText,
            flexShrink: 0,
          }}
        >
          <WarningAmberIcon fontSize="small" />
          <Typography variant="caption">{session.readOnlyMessage}</Typography>
        </Box>
      )}

      {session.conflict && (
        <Box
          role="alert"
          sx={{
            px: 1,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: theme => theme.palette.warning.light,
            color: theme => theme.palette.warning.contrastText,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" sx={{ flex: 1 }}>
            File changed externally while you have unsaved edits.
          </Typography>
          <Button size="small" onClick={() => session.conflict?.resolve('keep-local')}>
            Keep mine
          </Button>
          <Button size="small" onClick={() => session.conflict?.resolve('take-remote')}>
            Take theirs
          </Button>
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <RichEditor
          format={format}
          formData={session.content}
          onChange={session.setContent}
          readonly={effectiveReadOnly}
          height="100%"
        />
      </Box>
    </Box>
  );
});

File.displayName = 'File';

export default File;
