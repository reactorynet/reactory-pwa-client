import React, {  } from 'react'
import { isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Icon,
  Input,
  MenuItem,
  Select,
  FilledInput,
  OutlinedInput
} from '@material-ui/core';

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

  const { classes, formContext, formData, required, reactory, theme, schema, idSchema, uiSchema, onChange } = props;
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
        size,
        readOnly
      } = uiSchema['ui:options'];


      const onSelectChanged = (evt) => {
        reactory.log('Raising onChange for data select', { v: evt.target.value });
        props.onChange(evt.target.value)
        localStorage.setItem('questionSetKey', evt.target.value)
      }


      const getData = () => {
        const variables = propertyMap ? objectMapper(props, propertyMap) : null;
        setMenuItems([]);
        setError(null);
        reactory.graphqlQuery(query, variables).then((query_result: any) => {
          const { data, errors = [] } = query_result;

          if (errors.length > 0) {
            setMenuItems([{ key: null, title: 'Error Loading Data' }]);
            setVersion(version + 1);
          } else {

            if (data && data[resultItem]) {
              let _key_map: any = {};
              let _menuItems: any[] = [];
              try {
                _menuItems = resultsMap ? objectMapper(data, resultsMap) : data[resultItem]
              } catch (err) {

              }

              _menuItems.forEach((menu_item: any) => {
                if (menu_item.key) {
                  _key_map[menu_item.key] = menu_item;
                }
              });

              setKeyMap(_key_map);
              setMenuItems(_menuItems);
              setVersion(version + 1);
            }
          }

        }).catch((query_error) => {
          reactory.log(`Error Getting Data For Lookup`, { query_error }, 'error');
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
      }, []);


      React.useEffect(() => {
        getData();
      }, [formContext.formData])

      
      return (
        <Select
          {...selectProps}
          multiple={multiSelect === true}
          value={formData || ''}
          onChange={readOnly === true ? () => { } : onSelectChanged}
          name={idSchema.$id}
          variant={variant}
          data-version={version}
          input={
            <InputComponent id={idSchema.$id} value={typeof formData === 'string' ? formData.trim() : ""} />
          }
          renderValue={(_value: any) => {
            reactory.log(`Rendering value for ${_value}`, { formData, key_map, menuItems }, 'debug')
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
            error ? <MenuItem>Error Loading Data</MenuItem> : undefined
          }

          {
            menuItems.map((option: any, index: number) => {
              return (
                <MenuItem key={option.key || index} value={`${option.value}`}>
                  {option.icon ? <Icon>{option.icon}</Icon> : null}
                  {option.label}
                  {option.key === formData ? <Icon style={{ marginLeft: '8px' }}>check_circle</Icon> : null}
                </MenuItem>)
            })
          }
        </Select>
      );

    } else {
      return (<Select
        value={""}
        readOnly={true}
        name={props.name}
        input={<Input id={idSchema.$id} />}>
        <MenuItem value="">
          <em>No Query For Select Defined</em>
        </MenuItem>
      </Select>)
    }

  } catch (renderError) {
    setError(error);
  }
}
const SelectWithDataWidgetComponent = compose(withApi, withTheme, withStyles(styles))(SelectWithDataWidget)
export default SelectWithDataWidgetComponent
