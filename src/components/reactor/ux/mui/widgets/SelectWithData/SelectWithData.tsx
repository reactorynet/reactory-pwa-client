import React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { Input, OutlinedInput, FilledInput, FormControl, InputLabel, Select, MenuItem, Chip, Box } from '@mui/material';
import { Icon } from '@mui/material';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'SelectWithData';

const classes = {
  root: `${PREFIX}-root`,
  formControl: `${PREFIX}-formControl`,
  selectEmpty: `${PREFIX}-selectEmpty`
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    flexWrap: 'wrap',
  },

  [`& .${classes.formControl}`]: {
    minWidth: 120,
  },

  [`& .${classes.selectEmpty}`]: {
    marginTop: theme.spacing(2),
  }
}));

interface SelectWithDataOptions {
  query: string;
  propertyMap?: any;
  resultsMap?: any;
  resultItem: string;
  multiSelect?: boolean;
  selectProps?: any;
  labelStyle?: React.CSSProperties;
  labelProps?: {
    visible: boolean;
    [key: string]: any;
  };
  labelFormat?: string;
  labelKey?: string;
  valueKey?: string;
  formControlProps?: any;
  size?: 'small' | 'medium' | undefined;
  readOnly?: boolean;
  allowNullSelect?: boolean;
}

interface SelectWithDataProperties {
  formData: any,
  onChange: (formData: any) => void,
  readOnly: boolean,
  schema: Reactory.Schema.ISchema,
  uiSchema: any,
  formContext: any,
  reactor: any,
  [key: string]: any
}

const SelectWithDataWidget = (props: SelectWithDataProperties) => {
  const theme = useTheme();

  const defaultProps = {
    readOnly: false
  }

  const {  formContext, formData, required, reactor, schema, idSchema, uiSchema, onChange } = props;
  const [error, setError] = React.useState(null);
  const [menuItems, setMenuItems] = React.useState<any[]>([{
    id: 'loading',
    label: `Loading - ${schema.title}`,
    icon: 'hour_glass'
  }]);
  const [key_map, setKeyMap] = React.useState<any>({
    loading: {
      label: `Loading - ${schema.title}`,
      icon: 'hour_glass'
    }
  });

  const [version, setVersion] = React.useState(0);

  try {
    let variant: string | "standard" | "oulined" | "filled" = 'standard'
    if ((theme as any).MaterialInput) {
      variant = (theme as any).MaterialInput.variant || variant;
    }

    let InputComponent = Input;
    let inputLabelProps: any = {};

    switch (variant) {
      case 'outlined': {
        InputComponent = OutlinedInput;
        break;
      }
      case 'filled': {
        InputComponent = FilledInput;
      }
    }

    if (uiSchema['ui:options']) {

      const {
        query,
        propertyMap,
        resultsMap,
        resultItem,
        multiSelect,
        selectProps,
        labelStyle,
        labelProps,
        labelFormat,
        labelKey,
        valueKey,
        formControlProps,
        size,
        readOnly: uiReadOnly,
        allowNullSelect
      }: SelectWithDataOptions = uiSchema['ui:options'];

      if (query) {
        // Execute the query and populate the menu items
        // This would typically involve calling the reactor API
        // For now, we'll just set some placeholder data
        const placeholderItems = [
          { id: 'item1', label: 'Item 1' },
          { id: 'item2', label: 'Item 2' },
          { id: 'item3', label: 'Item 3' }
        ];
        setMenuItems(placeholderItems);
      }
    }

    return (
      <Root>
        <FormControl className={classes.formControl} {...(uiSchema['ui:options']?.formControlProps || {})}>
          <InputLabel id={`${idSchema.$id}-label`}>{schema.title}</InputLabel>
          <Select
            labelId={`${idSchema.$id}-label`}
            id={idSchema.$id}
            value={formData || ''}
            onChange={(event) => onChange(event.target.value)}
            input={<InputComponent />}
            readOnly={uiSchema['ui:options']?.readOnly || defaultProps.readOnly}
            size={uiSchema['ui:options']?.size}
            {...(uiSchema['ui:options']?.selectProps || {})}
          >
            {menuItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Root>
    );
  } catch (error) {
    console.error('Error in SelectWithDataWidget:', error);
    return (
      <Root>
        <Box color="error.main">
          Error loading select options: {error.message}
        </Box>
      </Root>
    );
  }
};

const SelectWithDataWidgetComponent = compose(withReactory)(SelectWithDataWidget);

export default SelectWithDataWidgetComponent;
