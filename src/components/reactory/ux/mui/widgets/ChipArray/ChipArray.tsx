import React, { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { pullAt } from 'lodash';
import {
  Chip,
  FormLabel,
  IconButton,
  Icon,
  TextField,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const PREFIX = 'ChipArray';

const classes = {
  root: `${PREFIX}-root`,
  chip: `${PREFIX}-chip`,
  newChipInput: `${PREFIX}-newChipInput`
};

const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  [`& .${classes.root}`]: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: theme.spacing(0.5),
  },
}));

/**
 * ChipArray Component
 * 
 * Renders an array of string items as chips with add/delete functionality.
 * Supports read-only mode, custom placeholders, and chip hiding when allowAdd is false.
 */
const ChipArray = (props: any) => {
  const theme = useTheme();
  const {
    formData = [],
    onChange,
    readOnly = false,
    readonly = false,
    disabled = false,
    schema,
    uiSchema = {},
    reactory,
  } = props;

  const [newChipLabelText, setNewChipLabelText] = useState('');

  const items = Array.isArray(formData) ? formData : [];

  let options: any = {
    labelFormat: '${item}',
    allowAdd: true,
    allowDelete: true,
    allowDeleteAll: false,
    placeholder: 'Add argument and press Enter...',
  };
  if (uiSchema && uiSchema['ui:options']) {
    options = { ...options, ...uiSchema['ui:options'] };
  }

  // Combined read-only check (supports RJSF readonly, readOnly, disabled, and ui:options)
  const isReadOnly = Boolean(
    readOnly ||
    readonly ||
    disabled ||
    options.readOnly ||
    options.readonly ||
    schema?.readOnly
  );

  const canAdd = !isReadOnly && options.allowAdd !== false;
  const canDelete = !isReadOnly && options.allowDelete !== false;
  const canDeleteAll = !isReadOnly && Boolean(options.allowDeleteAll);
  const size = options.size || 'small';
  const variant = options.variant || 'outlined';
  const color = options.color || 'default';
  const maxDisplay = options.maxDisplay || 5;

  // Arrays are not given a label by the field template, so a chip array in a
  // multi-field layout renders without any indication of what it holds. The
  // label is opt-in (set `label`, or `showLabel: true` to use the schema title)
  // so existing consumers keep their current, unlabelled appearance.
  const label: string | undefined = typeof options.label === 'string' && options.label.length > 0
    ? options.label
    : (options.showLabel === true ? schema?.title : undefined);

  // If readOnly and empty, display subtle fallback text
  if (isReadOnly && items.length === 0) {
    return (
      <Root>
        {label ? <FormLabel component="legend">{label}</FormLabel> : null}
        <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic', padding: '4px 0' }}>
          (None)
        </Typography>
      </Root>
    );
  }

  const onNewChipLabelTextChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setNewChipLabelText(evt.target.value);
  };

  const handleAddChip = () => {
    if (!newChipLabelText.trim()) return;
    const newText = newChipLabelText;
    setNewChipLabelText('');
    if (onChange) onChange([...items, newText]);
  };

  const onHandleChipLabelDelete = (_label: string, index: number) => {
    let newItems = [...items];
    pullAt(newItems, [index]);
    if (onChange) onChange(newItems);
  };

  const clearAll = () => {
    if (onChange) onChange([]);
  };

  const chips = items.map((item, index) => {
    const handleDelete = () => {
      onHandleChipLabelDelete(item, index);
    };

    let labelText = `${item}`;
    try {
      if (options.labelFormat && reactory?.utils?.template) {
        labelText = reactory.utils.template(options.labelFormat)({ item, index });
      }
    } catch {
      labelText = `${item}`;
    }

    const isCodeOrMultiline = labelText.includes('\n') || labelText.includes('process.') || labelText.includes('const ') || labelText.startsWith('-');

    return (
      <Chip
        key={index}
        onDelete={canDelete ? handleDelete : undefined}
        variant="outlined"
        label={labelText}
        sx={{
          margin: '2px',
          maxWidth: '100%',
          height: 'auto',
          alignItems: 'flex-start',
          borderRadius: '6px',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.23)',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          '& .MuiChip-label': {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'block',
            padding: '6px 8px',
            fontFamily: isCodeOrMultiline ? 'monospace, SFMono-Regular, Consolas, Roboto, sans-serif' : 'inherit',
            fontSize: '0.825rem',
            lineHeight: 1.4,
          },
          '& .MuiChip-deleteIcon': {
            marginTop: '6px',
            marginRight: '4px',
          }
        }}
      />
    );
  });

  /**
   * Renders the "add an item" input.
   *
   * This MUST stay a plain render function that is *called*, not a component
   * that is rendered as <AddItemComponentWrapper />. Declaring a component
   * inside the render body gives it a new function identity on every render, so
   * React treats it as a different element type and unmounts / remounts the
   * whole subtree - which tore down the TextField (and its focus and caret) on
   * every keystroke. Calling it returns the same element type each time, so the
   * input keeps its DOM node and only re-renders.
   */
  const renderAddItem = () => {
    if (options.addComponentFqn && reactory) {
      let AddItemComponent = reactory.getComponent(options.addComponentFqn);
      if (AddItemComponent) {
        const onAddItemHandler = (item: any) => {
          if (onChange) {
            onChange([...items, item.formData ?? item]);
          }
        };
        let addItemProps: any = {};
        if (options.onAddHandler) {
          addItemProps[options.onAddHandler] = onAddItemHandler;
        } else {
          addItemProps.onSubmit = onAddItemHandler;
        }
        if (options.addComponentProps) {
          addItemProps = {
            ...reactory.utils.templateObject(options.addComponentProps, {}),
            ...addItemProps,
          };
        }
        return <AddItemComponent {...addItemProps} />;
      }
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '6px', width: '100%' }}>
        <TextField
          size="small"
          variant="outlined"
          fullWidth
          multiline
          maxRows={4}
          placeholder={options.placeholder || 'Add argument and press Enter...'}
          value={newChipLabelText}
          onChange={onNewChipLabelTextChange}
          onKeyDown={(evt) => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
              evt.preventDefault();
              handleAddChip();
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.85rem',
              fontFamily: 'monospace, SFMono-Regular, Consolas, Roboto, sans-serif',
            }
          }}
        />
        <Tooltip title="Add argument">
          <span>
            <IconButton
              onClick={handleAddChip}
              disabled={!newChipLabelText.trim()}
              color="primary"
              size="small"
              sx={{ marginLeft: 1 }}
            >
              <Icon>add</Icon>
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  return (
    <Root>
      {label ? (
        <FormLabel component="legend" sx={{ fontSize: '0.75rem', mb: 0.5 }}>{label}</FormLabel>
      ) : null}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
        {chips}
        {items.length > 0 && canDeleteAll && (
          <Tooltip title="Remove all">
            <IconButton onClick={clearAll} size="small" sx={{ margin: '2px' }}>
              <Icon fontSize="small">delete_outline</Icon>
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {canAdd && renderAddItem()}
    </Root>
  );
};

ChipArray.propTypes = {
  formData: PropTypes.array,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  readOnly: PropTypes.bool,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  schema: PropTypes.object,
  uiSchema: PropTypes.object,
};

ChipArray.defaultProps = {
  formData: [],
  readOnly: false,
};

//@ts-ignore
export default compose(withReactory)(ChipArray);
