import React, { useEffect } from 'react';
import { useParams, useHistory } from 'react-router';
import SwipeableViews from 'react-swipeable-views';
import { makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import Icon from '@material-ui/core/Icon';

import { retrieveSchema } from '@reactory/client-core/components/reactory/form/utils';
import { Typography } from '@material-ui/core';
import { useReactory } from '@reactory/client-core/api';

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


  const history = useHistory();
  const params = useParams();

  const classes = useStyles();
  const theme = useTheme();
  const reactory = useReactory();

  const {
    uiSchema,
    errorSchema,
    idSchema,
    required,
    disabled,
    readonly,
    onBlur,
    formData,
  } = props;


  const layout = uiSchema['ui:tab-layout'] || [];
  const uiOptions = uiSchema['ui:tab-options'] || {};


  const getTabIndex = () => {
    const index = reactory.utils.lodash.findIndex(layout, { field: props.activeTab });
    if (index < 0) return 0;
    return index || 0;
  }

  const getTabKey = (index: number) => {
    return layout[index].field
  }

  const [value, setValue] = React.useState(getTabIndex());

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (uiOptions.useRouter === true) {
      const new_path = reactory.utils.template(uiOptions.path || '${tab_id}')({ props, tab_id: getTabKey(newValue) });
      history.push(new_path);
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



  const { definitions, fields, formContext } = props.registry
  const { SchemaField, TitleField, DescriptionField } = fields
  const schema = retrieveSchema(props.schema, definitions)
  const title = (schema.title === undefined) ? '' : schema.title

  const DefaultTabProps = {
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

  React.useEffect(() => {
    //determine default tab
    if (uiSchema["ui:options"] && uiSchema["ui:options"].activeTab === 'params') {
      if (uiSchema["ui:options"].activeTabKey) {
        let tab_param = uiSchema["ui:options"].activeTabKey;
        if (params[tab_param]) {
          let activeIndex = 0;

          layout.forEach((tabDef, tindex) => {
            if (schema.properties[params["tab_param"]]) {
              activeIndex = tindex;
            }
          });

          setValue(activeIndex);
        }
      }
    }
  }, [])


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

              return (<Tab key={tindex} textColor={theme.palette[tabUIOptions.textColor || "primary"].contrastText} icon={tabDef.icon ? (<Icon>{tabDef.icon}</Icon>) : null} label={`${tabDef.title || schema.properties[tabDef.field].title || tabDef.field}`} {...a11yProps(tindex)} />)
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
                formData={formData[tabDef.field]}
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
