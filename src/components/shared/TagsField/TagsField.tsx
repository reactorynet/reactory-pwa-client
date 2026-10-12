import React, { useState } from 'react';
import { Autocomplete, Chip, TextField } from '@mui/material';

/**
 * Split free text into trimmed, non-empty tokens (comma or newline separated).
 */
export const toTokens = (raw: string): string[] =>
  String(raw ?? '')
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean);

export interface TagsFieldProps {
  label: string;
  helperText?: string;
  value?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Optional suggestion list (freeSolo means the user can still add new values). */
  options?: string[];
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

/**
 * TagsField — a chip-style multi-value input.
 *
 * Replaces the old "comma-separated TextField" pattern which round-tripped the
 * value through `split(',')…filter(Boolean).join(', ')`; that dropped the
 * trailing comma on every keystroke, so a second value could never be typed.
 * Here each entry is an independent token: press Enter (or type/paste a comma)
 * to commit, and remove a chip with its delete affordance.
 */
export const TagsField: React.FC<TagsFieldProps> = ({
  label,
  helperText,
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
  fullWidth = true,
  size = 'medium',
}) => {
  const items = Array.isArray(value) ? value : [];
  const [inputValue, setInputValue] = useState('');

  const commit = (raw: string) => {
    const additions = toTokens(raw).filter((token) => !items.includes(token));
    if (additions.length > 0) {
      onChange([...items, ...additions]);
    }
    setInputValue('');
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      disabled={disabled}
      clearOnBlur={false}
      handleHomeEndKeys
      size={size}
      options={options}
      value={items}
      inputValue={inputValue}
      onInputChange={(_event, nextInput, reason) => {
        // Treat a typed or pasted comma as a token separator. This is what lets
        // the user "add commas" (and paste "a, b, c").
        if (nextInput.includes(',')) {
          commit(nextInput);
          return;
        }
        setInputValue(reason === 'reset' ? '' : nextInput);
      }}
      onChange={(_event, nextValue) => {
        const flat = (nextValue as string[])
          .flatMap((entry) => toTokens(entry))
          .filter(Boolean);
        onChange(Array.from(new Set(flat)));
        setInputValue('');
      }}
      renderTags={(tagValue, getTagProps) =>
        (tagValue as string[]).map((option, index) => (
          <Chip
            size="small"
            variant="outlined"
            label={option}
            {...getTagProps({ index })}
            key={`${option}-${index}`}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          fullWidth={fullWidth}
          label={label}
          helperText={helperText}
          placeholder={items.length === 0 ? placeholder : undefined}
        />
      )}
    />
  );
};

export default TagsField;
