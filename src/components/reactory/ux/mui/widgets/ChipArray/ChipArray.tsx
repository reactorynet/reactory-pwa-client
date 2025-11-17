import React, { Fragment, useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { pullAt } from 'lodash';
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
} from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const PREFIX = 'ChipArray';

const classes = {
  root: `${PREFIX}-root`,
  chip: `${PREFIX}-chip`,
  newChipInput: `${PREFIX}-newChipInput`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  [`& .${classes.chip}`]: {
    margin: theme.spacing(1),
  },

  [`& .${classes.newChipInput}`]: {
    margin: theme.spacing(1),
  }
}));

/**
 * ChipArray Component
 * 
 * Renders an array of chips with optional add/delete functionality.
 * 
 * IMPORTANT: This component will only render if formData is a valid array 
 * with at least 1 element. If formData is null, undefined, an object, 
 * string, number, or an empty array, the component will return null.
 */

const ChipArray = (props: any) => {
  const theme = useTheme();
  const {
    formData = [],
    onChange,
    onSubmit,
    readOnly = false,
    schema,
    uiSchema = {},
    reactory,
    classes,
  } = props;

  const [newChipLabelText, setNewChipLabelText] = useState('');

  // Validate that formData is a valid array with at least 1 element
  const isValidArray = Array.isArray(formData) && formData.length > 0;
  
  // If formData is not a valid array, don't render anything
  if (!isValidArray) {
    return null;
  }

  let options: any = {
    labelFormat: '${item}',
  };
  if (uiSchema['ui:options']) {
    options = { ...options, ...uiSchema['ui:options'] };
  }

  const onNewChipLabelTextChange = (evt) => {
    setNewChipLabelText(evt.target.value);
  };

  const onNewChipLabelTextKeyPress = (evt) => {
    if (evt.charCode === 13) {
      evt.preventDefault();
      const newText = newChipLabelText;
      setNewChipLabelText('');
      if (onChange) onChange([...formData, newText]);
    }
  };

  const onHandleChipLabelDelete = (label, index) => {
    let items = [...formData];
    pullAt(items, [index]);
    onChange([...items]);
  };

  const chips = formData?.map((item, index) => {
    const handleDelete = () => {
      onHandleChipLabelDelete(item, index);
    };
    let labelText = `${item}`;
    try {
      labelText = reactory.utils.template(options.labelFormat)({ item, index });
    } catch (templateErr) {
      labelText = `💥 ${templateErr.message}`;
    }
    return (
      <Chip 
        key={index} 
        onDelete={options.allowDelete ? handleDelete : undefined} 
        variant="outlined" 
        label={labelText}
      />
    );
  });

  const AddItemComponentWrapper = () => {
    if (options.addComponentFqn) {
      let AddItemComponent = reactory.getComponent(options.addComponentFqn);
      if (AddItemComponent !== null && AddItemComponent !== undefined) {
        const onAddItemHandler = (item) => {
          if (onChange) {
            onChange([...formData, { ...item.formData }]);
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
      <Input
        type="text"
        value={newChipLabelText}
        onChange={onNewChipLabelTextChange}
        onKeyPress={onNewChipLabelTextKeyPress}
        className={classes.newChipInput}
      />
    );
  };

  const clearAll = () => onChange([]);

  return (
    <Root>
      {chips}
      {formData?.length > 0 && options.allowDeleteAll && (
        <Tooltip title="Remove all">
          <IconButton onClick={clearAll} size="large">
            <Icon>delete_outline</Icon>
          </IconButton>
        </Tooltip>
      )}
      {options.allowAdd && <AddItemComponentWrapper />}
    </Root>
  );
};

ChipArray.propTypes = {
  formData: PropTypes.array,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  readOnly: PropTypes.bool,
  schema: PropTypes.object,
  uiSchema: PropTypes.object,
};

ChipArray.defaultProps = {
  formData: [],
  readOnly: false,
};

//@ts-ignore
export default compose(withReactory)(ChipArray);
