import React, { useEffect, useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import CheckIcon from '@mui/icons-material/Check';
import { useReactory } from '@reactory/client-core/api';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';
import { languageLabel, normaliseLanguage } from '@reactory/client-core/api/language';

/**
 * The subset of the Reactory API the selector depends on.
 *
 * Declared locally rather than imported from `@reactorynet/reactory-core` so
 * the component stays usable while the published typings catch up with the
 * language helpers added to `ReactoryApi`.
 */
export interface LanguageAwareReactory {
  getLanguage?: () => string;
  setLanguage?: (language: string) => Promise<unknown>;
  getSupportedLanguages?: () => Array<{ code: string; label: string }>;
  on?: (event: string, listener: (...args: any[]) => void) => unknown;
  removeListener?: (event: string, listener: (...args: any[]) => void) => unknown;
}

export interface LanguageSelectorProps {
  /** Injected by `withReactory`; falls back to context when omitted. */
  reactory?: LanguageAwareReactory;
  /** Icon button size; matches the surrounding toolbar controls by default. */
  size?: 'small' | 'medium' | 'large';
}

/**
 * A compact language switcher for the application header.
 *
 * Renders as a single icon button so it stays out of the way, and opens a menu
 * listing the languages the application ships. The active language is ticked.
 * The choice is delegated to `reactory.setLanguage`, which loads the bundle if
 * needed, persists the preference and re-renders the UI — so this component
 * owns no language logic of its own.
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  reactory: propReactory,
  size = 'large',
}) => {
  const hookReactory = useReactory();
  const reactory = (propReactory ||
    (hookReactory as unknown as LanguageAwareReactory)) as LanguageAwareReactory;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [active, setActive] = useState<string>(() =>
    normaliseLanguage(reactory?.getLanguage ? reactory.getLanguage() : undefined)
  );

  useEffect(() => {
    const onLanguageChanged = (language: string) => {
      setActive(normaliseLanguage(language));
    };
    reactory?.on?.(ReactoryApiEventNames.onLanguageChanged, onLanguageChanged);
    return () => {
      reactory?.removeListener?.(ReactoryApiEventNames.onLanguageChanged, onLanguageChanged);
    };
  }, [reactory]);

  const languages = reactory?.getSupportedLanguages ? reactory.getSupportedLanguages() : [];
  const open = Boolean(anchorEl);

  // A single language is not a choice; stay out of the toolbar.
  if (!languages || languages.length < 2) return null;

  return (
    <>
      <Tooltip title={`Language: ${languageLabel(active)}`}>
        <IconButton
          color="inherit"
          aria-label="Change language"
          aria-haspopup="true"
          aria-controls={open ? 'reactory-language-menu' : undefined}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          size={size}
          data-testid="language-selector-button"
        >
          <TranslateIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="reactory-language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {languages.map((language) => {
          const selected = normaliseLanguage(language.code) === active;
          return (
            <MenuItem
              key={language.code}
              selected={selected}
              onClick={() => {
                setAnchorEl(null);
                if (reactory?.setLanguage) {
                  // Switching can fail (e.g. the bundle is unavailable); keep a
                  // rejection from surfacing as an unhandled promise.
                  reactory.setLanguage(language.code).catch(() => undefined);
                }
              }}
              data-testid={`language-option-${language.code}`}
            >
              <ListItemIcon>
                {selected ? <CheckIcon fontSize="small" /> : <span style={{ width: 20 }} />}
              </ListItemIcon>
              <ListItemText primary={language.label} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSelector;
