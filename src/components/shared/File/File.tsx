import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/FiberManualRecord';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CodeIcon from '@mui/icons-material/Code';
import { useReactory } from '@reactory/client-core/api';
import RichEditor from '@reactory/client-core/components/reactory/ux/mui/widgets/RichEditor';
import { useContentRender } from '../hooks/useContentRender';
import { FileHandle, FileProps } from './types';
import useFileSession from './hooks/useFileSession';
import useSaveShortcut from './hooks/useSaveShortcut';
import { formatFromExtension, detectFileType } from './utils';

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
    mimetype: propMimetype,
    mimeType: propMimeTypeAlt,
    readOnly: readOnlyProp,
    height,
    defaultViewMode = 'preview',
    showPreviewToggle = true,
    onChange,
    onSave,
    onSaved,
    onSaveError,
    onExternalChange,
  } = props;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const reactory = useReactory();
  const { renderContent } = useContentRender(reactory);

  const session = useFileSession({
    path,
    scope,
    onSave,
    onSaved,
    onSaveError,
    onExternalChange,
  });

  const effectiveMime = propMimetype || propMimeTypeAlt || session.mimetype || undefined;
  const format = formatOverride ?? formatFromExtension(path);

  const fileTypeInfo = React.useMemo(
    () => detectFileType({ path, mimetype: effectiveMime, format }),
    [path, effectiveMime, format],
  );

  const isPreviewable = fileTypeInfo.isPreviewable;

  const [viewMode, setViewMode] = React.useState<'preview' | 'raw'>(
    () => (isPreviewable ? defaultViewMode : 'raw'),
  );

  // When path changes, reset view mode to defaultViewMode if previewable
  React.useEffect(() => {
    if (isPreviewable) {
      setViewMode(defaultViewMode);
    } else {
      setViewMode('raw');
    }
  }, [path, isPreviewable, defaultViewMode]);
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
    getViewMode: () => viewMode,
    setViewMode: (mode: 'preview' | 'raw') => setViewMode(mode),
  }), [session, viewMode]);

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

        {showPreviewToggle && isPreviewable && (
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode) setViewMode(newMode);
            }}
            aria-label="file view mode"
            sx={{
              height: 24,
              '& .MuiToggleButton-root': {
                px: 1,
                py: 0,
                fontSize: '0.7rem',
                textTransform: 'none',
                lineHeight: 1,
                height: 24,
                gap: 0.5,
              },
            }}
          >
            <ToggleButton value="preview" aria-label="Preview">
              <VisibilityOutlinedIcon sx={{ fontSize: 13 }} />
              Preview
            </ToggleButton>
            <ToggleButton value="raw" aria-label="Raw">
              <CodeIcon sx={{ fontSize: 13 }} />
              Raw
            </ToggleButton>
          </ToggleButtonGroup>
        )}

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

      {viewMode === 'preview' && isPreviewable ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            p: 2.5,
            whiteSpace: fileTypeInfo.type === 'text' ? 'pre-wrap' : 'normal',
            fontFamily: fileTypeInfo.type === 'text'
              ? '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
              : 'inherit',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: 'text.primary',
            '& img': { maxWidth: '100%', height: 'auto' },
            '& table': { maxWidth: '100%' },
            '& pre': { my: 1 },
          }}
          className="file-preview-content"
          data-testid="file-preview-content"
        >
          {session.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !session.content ? (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                File is empty
              </Typography>
            </Box>
          ) : (
            renderContent(session.content)
          )}
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <RichEditor
            format={format}
            formData={session.content}
            onChange={session.setContent}
            readonly={effectiveReadOnly}
            height="100%"
          />
        </Box>
      )}
    </Box>
  );
});

File.displayName = 'File';

export default File;
