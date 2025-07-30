import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { DefaultTheme, makeStyles, useTheme } from '@mui/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Icon from '@mui/material/Icon';
import { Theme } from '@mui/material'
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryFormUtilities } from 'components/reactory/form/types';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  options?: any;
  index: any;
  value: any;
}


const useStyles = makeStyles((theme: Theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
}));

const MaterialTabbedField = (props) => {


  const navigate = useNavigate();
  const params = useParams();
  const pathQuery = new URLSearchParams(window.location.search);
  

  const classes = useStyles();
  const theme = useTheme<DefaultTheme>();
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
  }

  const getTabIndex = (field: string) => {
    const index = reactory.utils.lodash.findIndex(layout, { field });
    if (index < 0) return 0;
    return index || 0;
  }

  const getTabKey = (index: number) => {
    return layout[index].field
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
    <>
      <AppBar {...options.appBarProps}>
        <Tabs {...TabsProps}>
          {layout.map((tabDef, tindex) => {
            if (schema.properties[tabDef.field]) {
              let tabUISchema = uiSchema[tabDef.field] || {};
              let tabUIOptions = tabUISchema["ui:options"] || {}

              //textColor={theme.palette[tabUIOptions.textColor || "primary"].contrastText} 

              return (
                <Tab 
                  key={tindex} 
                  icon={tabDef.icon ? (<Icon>{tabDef.icon}</Icon>) : null} 
                  color={
                    //@ts-ignore
                    theme.palette[tabUIOptions.textColor || "primary"].contrastText}
                  label={`${tabDef.title || schema.properties[tabDef.field].title || tabDef.field}`} 
                  {...a11yProps(tindex)} />)
            }
          })}

        </Tabs>
      </AppBar>
      
        {layout.map((tabDef, tindex) => {
          if (schema.properties[tabDef.field] && tindex === value) {

            return (<Box key={tindex} role="tabpanel"

              id={`full-width-tabpanel-${tindex}`}
              aria-labelledby={`full-width-tab-${tindex}`} p={1}>

              <SchemaField
                name={tabDef.field}
                required={isRequired(tabDef.field)}
                schema={schema.properties[tabDef.field]}
                uiSchema={uiSchema[tabDef.field]}
                errorSchema={errorSchema[tabDef.field]}
                idSchema={idSchema[tabDef.field]}
                formData={formData?.[tabDef.field]}
                formContext={formContext}
                onChange={onPropertyChange(tabDef.field)}
                onBlur={onBlur}
                registry={props.registry}
                disabled={disabled}
                readonly={readonly} />

            </Box>)

          }
          
        })}      
    </>
  );
}

export default MaterialTabbedField;
