import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ContentFormat, FORMAT_LABELS } from '../format';
import { languageLabel } from '../types';

/**
 * The kinds of help the panel can pre-compose a prompt for.
 */
export type AIAssistIntent = 'translate' | 'improve' | 'summarise' | 'expand' | 'none';

export interface AIAssistPanelProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  /** Persona configuration supplied by the host form, if any. */
  aipersona?: Reactory.Schema.UIAIOptions;
  /** The body the author is currently working on. */
  content: string;
  format: ContentFormat;
  title: string;
  /** Language of the body being edited. */
  currentLang: string;
  /** Set when the panel was opened to translate into a specific language. */
  targetLang?: string;
  intent: AIAssistIntent;
  /** Replaces the body being edited with the supplied text. */
  onApply: (content: string) => void;
}

const PANEL_WIDTH = 460;

/**
 * Builds the prompt the assistant is seeded with.
 *
 * The instructions about preserving `<reactory />` tags and the authoring
 * format matter: content bodies routinely embed component tags, and an
 * assistant that rewrites them produces output that cannot be applied.
 */
const buildPrompt = (
  intent: AIAssistIntent,
  args: { content: string; format: ContentFormat; title: string; currentLang: string; targetLang?: string }
): string => {
  const { content, format, title, currentLang, targetLang } = args;
  if (intent === 'none') return '';

  const constraints = [
    `The content is written in ${FORMAT_LABELS[format]}. Return ${FORMAT_LABELS[format]} only.`,
    'Preserve any <reactory ... /> tags exactly as they appear — do not translate, reformat or remove them.',
    'Return only the content itself, with no commentary, explanation or code fence around it.',
  ].join(' ');

  const heading = (() => {
    switch (intent) {
      case 'translate':
        return `Translate the following content from ${languageLabel(currentLang)} into ${languageLabel(
          targetLang || 'en'
        )}. Keep the tone and structure of the original.`;
      case 'improve':
        return 'Improve the clarity and flow of the following content. Keep the meaning, structure and approximate length.';
      case 'summarise':
        return 'Summarise the following content into a concise version that keeps the key points.';
      case 'expand':
        return 'Expand the following content with more detail and useful specifics, keeping the existing tone.';
      default:
        return '';
    }
  })();

  return `${heading}\n\n${constraints}\n\nTitle: ${title || '(untitled)'}\n\n---\n${content}\n---`;
};

/**
 * AI assistance for writing and translating, presented beside the content.
 *
 * The drawer has no backdrop so the content being edited stays visible and
 * interactive: the author can watch the body while the assistant works on it.
 *
 * Memoised, and given a frozen snapshot of the body rather than the live one.
 * The assistant hosts a very large component tree, so re-rendering it on every
 * keystroke is what made editing feel sluggish. Freezing is also the correct
 * semantics: the request describes the content as it was when you asked.
 */
const AIAssistPanelComponent: React.FC<AIAssistPanelProps> = ({
  open,
  onClose,
  reactory,
  aipersona,
  content,
  format,
  title,
  currentLang,
  targetLang,
  intent,
  onApply,
}) => {
  const [tab, setTab] = useState(0);
  const [applyText, setApplyText] = useState('');
  const [copied, setCopied] = useState(false);

  const { ReactorChat } = reactory.getComponents<any>(['reactor.ReactorChat']);

  const prompt = useMemo(
    () => buildPrompt(intent, { content, format, title, currentLang, targetLang }),
    [intent, content, format, title, currentLang, targetLang]
  );

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      reactory.log('Could not copy the prompt to the clipboard', {}, 'warning');
    }
  }, [prompt, reactory]);

  const applyAndClose = useCallback(() => {
    if (!applyText.trim()) return;
    onApply(applyText);
    setApplyText('');
    onClose();
  }, [applyText, onApply, onClose]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // An invisible backdrop keeps the page usable while the panel is open,
      // which is the point of assistance that sits beside your work.
      // Deliberately NOT keepMounted. ReactorChat is a ~13,500 component tree;
      // keeping it mounted parks all of it inside the editor, where it then
      // re-renders on every keystroke. Profiling a typing session showed that
      // costing ~133ms of each ~145ms commit while the panel was closed. With
      // this off, MUI renders nothing until the panel is first opened.
      ModalProps={{ BackdropProps: { invisible: true } }}
      PaperProps={{
        sx: { width: { xs: '100%', sm: PANEL_WIDTH }, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          AI assistance
        </Typography>
        {targetLang && (
          <Chip size="small" label={`→ ${languageLabel(targetLang)}`} color="primary" variant="outlined" />
        )}
        <IconButton size="small" onClick={onClose} aria-label="Close AI assistance">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth">
        <Tab label="Chat" />
        <Tab label="Apply result" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {prompt && (
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                  The request below has been placed in the chat box for you to review and send.
                </Typography>
                <Tooltip title={copied ? 'Copied' : 'Copy prompt'}>
                  <IconButton size="small" onClick={copyPrompt}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          )}

          <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
            {ReactorChat ? (
              <ReactorChat
                {...(aipersona || {})}
                personaId={aipersona?.personaId}
                initialPrompt={prompt}
              />
            ) : (
              <Alert severity="warning" sx={{ m: 2 }}>
                The ReactorChat component is not registered in this application, so conversational
                assistance is unavailable. You can still paste a result into the Apply tab.
              </Alert>
            )}
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Paste the assistant's result here to replace the body you are editing. Your current
            content stays untouched until you apply.
          </Typography>

          <TextField
            multiline
            minRows={14}
            fullWidth
            value={applyText}
            onChange={(e) => setApplyText(e.target.value)}
            placeholder={`Paste ${FORMAT_LABELS[format]} content here`}
            sx={{
              flexGrow: 1,
              '& textarea': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem' },
            }}
          />

          <Divider />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="inherit" onClick={() => setApplyText('')} disabled={!applyText}>
              Clear
            </Button>
            <Button variant="contained" onClick={applyAndClose} disabled={!applyText.trim()}>
              Replace content
            </Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
};

/**
 * Every prop this panel takes is either stable or frozen at open time by the
 * host, so a plain shallow comparison is enough to keep the assistant out of
 * the editor's keystroke path.
 */
export const AIAssistPanel = React.memo(AIAssistPanelComponent);

export default AIAssistPanel;
