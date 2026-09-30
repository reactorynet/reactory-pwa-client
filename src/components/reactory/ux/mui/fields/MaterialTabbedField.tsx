import React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Icon from '@mui/material/Icon';
import { Theme } from '@mui/material'
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryFormUtilities } from '@reactory/client-core/components/reactory/form/types';

const PREFIX = 'MaterialTabbedField';

const classes = {
  root: `${PREFIX}-root`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')(({ theme }: { theme: Theme }) => ({
  [`& .${classes.root}`]: {
    backgroundColor: theme.palette.background.paper,
  }
}));

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  options?: any;
  index: any;
  value: any;
}

/**
 * Resolve the property names a tab owns.
 *
 * `field: 'x'` is the original contract (one property per tab). `fields: ['a','b']`
 * groups several flat properties into one tab, which lets a form adopt tabs
 * without nesting its schema — so the formData shape (and any GraphQL mapping)
 * is unchanged.
 *
 * The v5 equivalent (`form-engine/fields/TabbedLayoutField.tsx`) implements the
 * same contract. `fields` MUST be supported on both engines: this component is
 * what runs whenever the `core.FormsEngineV5` flag is off, and it previously
 * ignored `fields` entirely — so a `fields`-based `ui:tab-layout` rendered no tab
 * bar and no panels (a blank form) on the fork.
 */
const resolveTabFields = (tabDef: any): string[] => {
  if (Array.isArray(tabDef?.fields) && tabDef.fields.length > 0) return tabDef.fields;
  if (typeof tabDef?.field === 'string' && tabDef.field.length > 0) return [tabDef.field];
  return [];
};

const MaterialTabbedField = (props) => {


  const navigate = useNavigate();
  const params = useParams();
  const pathQuery = new URLSearchParams(window.location.search);
  


  const theme = useTheme<Theme>();
  const reactory = useReactory();

  const utils = reactory.getComponent<ReactoryFormUtilities>('core.ReactoryFormUtilities');

  const {
    uiSchema,
    errorSchema,
    idSchema,
    required,
    disabled,
    readonly,
    onBlur,
    formData,
    formContext,
  } = props;

  
  const layout = uiSchema['ui:tab-layout'] || [];
  const uiOptions = uiSchema['ui:tab-options'] || {};


  const getActiveTabIndex = () => {
     if (uiSchema["ui:options"] && uiSchema["ui:options"].activeTab) {
      switch (uiSchema["ui:options"].activeTab) { 
        case "params":
          if (params[uiSchema["ui:options"].activeTabKey]) {                    
            return getTabIndex(params[uiSchema["ui:options"].activeTabKey]);
          }
          break;
        case "query":
          if (pathQuery.get(uiSchema["ui:options"].activeTabKey)) {
            return getTabIndex(pathQuery.get(uiSchema["ui:options"].activeTabKey));
          }
          break;
        default:
          break;
      }      
    }
    // Default to the first tab. Without this the initial index is `undefined`,
    // so `tindex === value` is never true and no panel renders on first paint
    // (a blank form) unless the form happened to configure `activeTab`.
    return 0;
  }

  const getTabIndex = (field: string) => {
    const index = reactory.utils.lodash.findIndex(layout, (tabDef: any) => resolveTabFields(tabDef).indexOf(field) !== -1);
    if (index < 0) return 0;
    return index || 0;
  }

  const getTabKey = (index: number) => {
    return resolveTabFields(layout[index])[0];
  }

  const [value, setValue] = React.useState(getActiveTabIndex());

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (uiOptions.useRouter === true) {
      const templateProps = { ...props, tab_id: getTabKey(newValue) }
      const new_path = reactory.utils.template(uiOptions.path || '${tab_id}')(templateProps);
      navigate(new_path);
    } else {
      setValue(newValue);
    }


  };

  const handleChangeIndex = (index: number) => {
    setValue(index);
  };



  const TabPanel = (panelProps: TabPanelProps) => {
    const { children, value, index, options } = panelProps;

    if (value !== index) return null;

    return (
      <Box key={index} role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`} p={1}>
        {children}
      </Box>
    );
  }

  function a11yProps(index: any) {
    return {
      id: `full-width-tab-${index}`,
      'aria-controls': `full-width-tabpanel-${index}`,
      key: `tab-${index}`,
    };
  }



  const { definitions, fields } = props.registry
  const { SchemaField, TitleField, DescriptionField } = fields
  const schema = utils.retrieveSchema(props.schema, definitions)  
  const DefaultTabProps: Reactory.Schema.ITabOptions = {
    useRouter: false,
    tabsProps: {
      indicatorColor: "primary",
      textColor: "primary",
      variant: "fullWidth",
      "aria-label": `Tabbed navigation for ${schema.title ? schema.title : "form field"}`,
    }
  }

  let options: any = {
    appBarProps: {
      position: "static",
      color: "default",
    },
    tabsProps: { ...DefaultTabProps.tabsProps }
  };

  const uiSchemaOptions = uiSchema["ui:options"] || {};

  if (uiSchemaOptions.tabsProps) {
    options.tabsProps = { ...DefaultTabProps, ...uiSchemaOptions.tabsProps };
  }

  if (uiSchemaOptions.appBarProps) {
    options.appBarProps = { ...options.appBarProps, ...uiSchemaOptions.appBarProps };
  }

  const isRequired = (name: string) => {
    return (
      Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
    );
  }

  const onPropertyChange = name => {
    return (value, errorSchema) => {
      const newFormData = { ...formData, [name]: value };

      props.onChange(
        newFormData,
        errorSchema &&
        props.errorSchema && {
          ...props.errorSchema,
          [name]: errorSchema,
        }
      );

    };
  };

  const TabsProps = {
    ...options.tabsProps,
    value,
    onChange: handleChange
  }


  /**
   * 
   */

  return (
    <Root>
      <AppBar {...options.appBarProps}>
        <Tabs {...TabsProps}>
          {layout.map((tabDef, tindex) => {
            const tabFieldNames = resolveTabFields(tabDef);
            const firstField = tabFieldNames[0];

            if (tabFieldNames.some((fieldName) => schema.properties[fieldName])) {
              let tabUISchema = uiSchema[firstField] || {};
              let tabUIOptions = tabUISchema["ui:options"] || {}

              //textColor={theme.palette[tabUIOptions.textColor || "primary"].contrastText} 

              return (
                <Tab 
                  key={tindex} 
                  icon={tabDef.icon ? (<Icon>{tabDef.icon}</Icon>) : null} 
                  color={
                    //@ts-ignore
                    theme.palette[tabUIOptions.textColor || "primary"].contrastText}
                  label={`${tabDef.title || (schema.properties[firstField] && schema.properties[firstField].title) || firstField}`} 
                  {...a11yProps(tindex)} />)
            }
          })}

        </Tabs>
      </AppBar>
      {layout.map((tabDef, tindex) => {
        const tabFieldNames = resolveTabFields(tabDef).filter((fieldName) => schema.properties[fieldName]);

        if (tabFieldNames.length > 0 && tindex === value) {

          return (<Box key={tindex} role="tabpanel"

            id={`full-width-tabpanel-${tindex}`}
            aria-labelledby={`full-width-tab-${tindex}`} p={1}>

            {tabFieldNames.map((fieldName) => (
              <SchemaField
                key={fieldName}
                name={fieldName}
                required={isRequired(fieldName)}
                schema={schema.properties[fieldName]}
                uiSchema={uiSchema[fieldName]}
                errorSchema={errorSchema && errorSchema[fieldName]}
                idSchema={idSchema[fieldName]}
                formData={formData?.[fieldName]}
                formContext={formContext}
                onChange={onPropertyChange(fieldName)}
                onBlur={onBlur}
                registry={props.registry}
                disabled={disabled}
                readonly={readonly} />
            ))}

          </Box>)

        }
        
      })}
    </Root>
  );
}

export default MaterialTabbedField;
