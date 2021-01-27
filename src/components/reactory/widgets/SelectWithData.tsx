import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Chip,
  IconButton,
  Icon,
  FormControl,
  InputLabel,
  Input,
  MenuItem,
  Typography,
  Tooltip,
  Select,
  FilledInput,
  FormHelperText,
  OutlinedInput,
  StyleRulesCallback,
  Theme
} from '@material-ui/core';

import { Query } from '@apollo/client/react/components';
import gql from 'graphql-tag';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import ReactoryApi from '@reactory/client-core/api/ReactoryApi';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/client-core/types/reactory';

const styles = (theme: any): any => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  formControl: {
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
});


interface SelectWithDataProperties {
  formData: any,
  onChange: (formData: any) => void,
  readOnly: boolean,
  schema: Reactory.ISchema,
  uiSchema: any,
  formContext: any,
  reactory: ReactoryApi,
  [key: string]: any
}

const SelectWithDataWidget = (props: SelectWithDataProperties) => {


  const defaultProps = {
    readOnly: false
  }

  const { classes, formContext, formData, required, reactory, theme, schema, idSchema, uiSchema } = props;
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

  if (error !== undefined && error !== null) {
    return <Typography>🚩 core.SelectWithData Error - see log</Typography>
  }

  try {

    reactory.log('Rendering SelectWithData', { formContext, formData, menuItems, key_map }, 'debug');

    let variant: string | "standard" | "oulined" | "filled" = 'standard'
    if (theme.MaterialInput) {
      variant = theme.MaterialInput.variant || variant;
    }

    let InputComponent = Input;
    let inputLabelProps: any = {};

    switch (variant) {
      case 'outlined': {
        InputComponent = OutlinedInput;
        if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
          inputLabelProps.style = {
            backgroundColor: theme.palette.background.paper,
            // marginTop: '4px',
            padding: '4px'
          };
        }
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
        selectProps = {},
        labelStyle = {},
        labelProps = { visible: true },
        formControlProps = {},
        size
      } = uiSchema['ui:options'];


      const onSelectChanged = (evt) => {
        reactory.log('Raising onChange for data select', { v: evt.target.value });
        props.onChange(evt.target.value);
      }


      const getData = () => {
        const variables = propertyMap ? objectMapper(props, propertyMap) : null;

        reactory.graphqlQuery(query, variables).then((query_result: any) => {
          const { data, error } = query_result;

          if (data && data[resultItem]) {
            let _key_map: any = {};
            let _menuItems: any[] = resultsMap ? objectMapper(data, resultsMap) : data[resultItem]
            _menuItems.forEach((menu_item: any) => {
              if (menu_item.key) {
                _key_map[menu_item.key] = menu_item;
              }
            });

            setKeyMap(_key_map);
            setMenuItems(_menuItems);
            setVersion(version + 1);
          }
        }).catch((query_error) => {
          reactory.log(`Error Getting Data For Lookup`)
          setError(query_error);
        });
      };


      const emptySelect = required === false ? <MenuItem value="">
        <em>None</em>
      </MenuItem> : null;

      inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }

      if (formData !== null && formData !== undefined && formData !== '') {
        inputLabelProps.shrink = true;
      }

      React.useEffect(() => {
        getData();
      }, [])


      return (
        <FormControl size={size || "medium"}>
          { labelProps && labelProps.visible === true && <InputLabel htmlFor={idSchema.$id}>{schema.title}</InputLabel> }
          <Select
            {...selectProps}
            multiple={multiSelect === true}
            value={formData || ''}
            onChange={onSelectChanged}
            name={idSchema.$id}
            variant={variant}
            data-version={version}
            input={
              <InputComponent id={idSchema.$id} value={typeof formData === 'string' ? formData.trim() : ""} />
            }
            renderValue={(_value: any) => {
              reactory.log(`Rendering value for ${_value}`, { formData, key_map, menuItems })
              if (_value === null || _value === undefined || _value.length === 0) {
                return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>{menuItems[0].id === 'loading' ? 'Loading' : 'Select'}</span>;
              }

              if (Array.isArray(_value))
                return _value.join(', ');
              else {
                if (key_map[_value] && key_map[_value].label) {
                  return key_map[_value].label;
                }

                return _value;
              }

            }}>

            {
              menuItems.map((option: any, index: number) => {
                return (
                  <MenuItem key={option.key || index} value={`${option.value}`}>
                    { option.icon ? <Icon>{option.icon}</Icon> : null}
                    { option.label}
                    { option.key === formData ? <Icon style={{ marginLeft: '8px' }}>check_circle</Icon> : null}
                  </MenuItem>)
              })
            }
          </Select>
        </FormControl>
      );

    } else {
      return <React.Fragment>
        <InputLabel htmlFor={idSchema.$id}>{schema.title}</InputLabel>
        <Select
          value={""}
          readOnly={true}
          name={props.name}
          input={<Input id={idSchema.$id} />}>
          <MenuItem value="">
            <em>No Query For Select Defined</em>
          </MenuItem>
        </Select>
      </React.Fragment>
    }

  } catch (renderError) {
    setError(error);
  }
}
const SelectWithDataWidgetComponent = compose(withApi, withTheme, withStyles(styles))(SelectWithDataWidget)
export default SelectWithDataWidgetComponent
