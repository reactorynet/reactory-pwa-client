import React, {  } from 'react'
import { styled } from '@mui/material/styles';
import { isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Icon,
  Input,
  MenuItem,
  Select,
  FilledInput,
  OutlinedInput
} from '@mui/material';

import { compose } from 'redux'
import { useTheme } from '@mui/material/styles';
import ReactoryApi from '@reactory/client-core/api/ReactoryApi';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import Reactory from '@reactory/reactory-core';

const PREFIX = 'SelectWithDataWidgetComponent';

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
  reactory: ReactoryApi,
  [key: string]: any
}

const SelectWithDataWidget = (props: SelectWithDataProperties) => {
  const theme = useTheme();

  const defaultProps = {
    readOnly: false
  }

  const {  formContext, formData, required, reactory, schema, idSchema, uiSchema, onChange } = props;
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
    let variant: string | "standard" | "outlined" | "filled" = 'standard'
    if (theme.components?.MuiInput) {
      // TODO fix the variant type
      //variant = (theme.components.MuiInput.variants[0]?.props as 'standard' | 'outlined' | 'filled') || variant;
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
        selectProps = {},
        labelStyle = {},
        labelKey = 'key',
        valueKey = 'value',
        labelFormat = '${option.label}',
        labelProps = { visible: true },
        formControlProps = {},
        size,
        readOnly,
        allowNullSelect = true,
      } = uiSchema['ui:options'] as SelectWithDataOptions;

      const graphql: Reactory.Forms.IReactoryFormQuery = uiSchema['ui:graphql'];

      const onSelectChanged = (evt) => {
        const value = evt.target.value;
        reactory.log('Raising onChange for data select', { v: value, target: evt.target });
        
        // Convert empty string to null when allowNullSelect is true
        const finalValue = (value === '' && allowNullSelect) ? null : value;
        props.onChange(finalValue);
      }


      const getData = () => {
        
        setMenuItems([]);
        setError(null);      
        let graphqlQuery: Reactory.Forms.IReactoryFormQuery  = null;
        if (graphql?.text && graphql?.name){
          graphqlQuery = graphql;        
        } else {
          // backwards compatibility
          graphqlQuery = {
            name: resultItem,
            text: query,
            variables: propertyMap,
            resultMap: resultsMap,
          }
        }

        let graphqlStaticProps = { };
        if (graphql?.props) {
          graphqlStaticProps = { ...graphql.props };
        }

        const variables = objectMapper({ ...props, ...graphqlStaticProps }, graphqlQuery.variables);

        reactory.graphqlQuery(graphqlQuery.text, variables).then((query_result: any) => {
          const { data, errors = [] } = query_result;

          if (errors.length > 0) {
            setMenuItems([{ key: null, title: 'Error Loading Data' }]);
            setVersion(version + 1);
          } else {

            if (data && data[graphqlQuery.name]) {
              let _key_map: any = {};
              let _menuItems: any[] = [];
              let resultMap = graphqlQuery.resultMap || {};
              // check if the graphqlQuery has typename handlers
              if (graphqlQuery?.responseHandlers?.[data[graphqlQuery.name].__typename]) {
                resultMap = graphqlQuery.responseHandlers[data[graphqlQuery.name]]?.resultMap || resultMap;
              }
              try {
                _menuItems = graphqlQuery.resultMap ? 
                  objectMapper(data[graphqlQuery.name],resultMap) : 
                  data[resultItem]
              } catch  {}
              
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
          reactory.log(`Error Getting Data For Lookup`, { query_error });
          setError(query_error);
        });
      };




      inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }

      // Ensure label shrinks when formData has a value (including 0)
      const hasValue = formData !== null && formData !== undefined && formData !== '';
      if (hasValue) {
        inputLabelProps.shrink = true;
        
        // Add specific styling for outlined variant when label is shrunk
        if (variant === 'outlined') {
          inputLabelProps.style = {
            ...inputLabelProps.style,
            backgroundColor: theme.palette.background.paper,
            padding: '4px'
          };
        }
      }
      
      // Debug logging for label shrink behavior
      reactory.log('SelectWithData label shrink logic', { 
        formData, 
        formDataType: typeof formData, 
        hasValue, 
        shrink: inputLabelProps.shrink,
        variant 
      });

      React.useEffect(() => {
        reactory.log('Rendering SelectWithData', { formContext, formData, menuItems, key_map, version });
        getData();
      }, []);


      React.useEffect(() => {
        getData();
      }, [formContext.formData])

      
      return (
        <Select
          {...selectProps}
          multiple={multiSelect === true}
          value={formData || ""}
          onChange={readOnly === true ? () => { } : onSelectChanged}
          name={idSchema.$id}
          variant={variant}
          data-version={version}
          // input={
          //   <InputComponent 
          //     id={idSchema.$id}
          //     type="text"                    
          //     value={formData !== null && formData !== undefined ? (typeof formData === 'string' ? formData.trim() : `${formData}`) : ''} />
          // }
          renderValue={(_value: any) => {
            reactory.log(`Rendering value for ${_value}`, { formData, key_map, menuItems });
            if (key_map.loading) return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>Loading</span>;
            
            // Handle null/empty value selection
            if (_value === null || _value === undefined || _value === '' || (Array.isArray(_value) && _value.length === 0)) {
              if (_value === '' && allowNullSelect) {
                return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>None</span>;
              }
              return <span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>{menuItems[0].id === 'loading' ? 'Loading' : 'Select'}</span>;
            }

            if (Array.isArray(_value))
              return _value.join(', ');
            else {
              if (labelFormat) {
                return reactory.utils.template(labelFormat)({ option: key_map[_value] });
              } else {
                if (key_map[_value] && key_map[_value].label) {
                  return reactory.utils.template(key_map[_value].label)({ option: key_map[_value] });
                }
                return _value;
              }
            }

          }}>

          {
            error ? <MenuItem>Error Loading Data</MenuItem> : undefined
          }

          {/* Add null/empty option when allowNullSelect is true */}
          {allowNullSelect && !multiSelect ? (
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
          ) : null}

          {
            menuItems.map((option: any, index: number) => {
              let label = option.label || labelFormat
              if (labelFormat && typeof labelFormat === 'string' && labelFormat.startsWith('${')) {
                try {
                  label = reactory.utils.template(labelFormat)({ option, index });
                } catch (templateErr) {
                  label = `💥 ${templateErr.message}`;
                }
              }
              // Add null checks for option, option[valueKey], and option[labelKey]
              const optionValue = option && option[valueKey] ? option[valueKey] : '';
              const optionKey = option && option[labelKey] !== undefined ? option[labelKey] : index;
              return (
                <MenuItem key={optionKey} value={optionValue}>
                  {option && option.icon ? <Icon>{option.icon}</Icon> : null}
                  {label}
                  {option && option[valueKey] === formData ? <Icon style={{ marginLeft: '8px' }}>check_circle</Icon> : null}
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
    // Do NOT call setError here, just render a fallback UI
    return <Root style={{ color: 'red' }}>Error rendering select: {String(renderError)}</Root>;
  }
}
const SelectWithDataWidgetComponent = compose(withReactory)(SelectWithDataWidget)
export default SelectWithDataWidgetComponent
