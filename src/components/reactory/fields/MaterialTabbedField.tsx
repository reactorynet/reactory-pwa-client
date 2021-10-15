import React from 'react';
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

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: any;
  value: any;
}


function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  if(value !== index) return null;

  return (
    <Box key={index} role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`} p={1}>
      <Typography>{children}</Typography>
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

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
}));

const MaterialTabbedField = (props) => {
  const classes = useStyles();
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const history = useHistory();
  const params = useParams();

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: number) => {
    setValue(index);
  };

  const {
    uiSchema,
    errorSchema,
    idSchema,
    required,
    disabled,
    readonly,
    onBlur,
    formData
  } = props
  const { definitions, fields, formContext } = props.registry
  const { SchemaField, TitleField, DescriptionField } = fields
  const schema = retrieveSchema(props.schema, definitions)
  const title = (schema.title === undefined) ? '' : schema.title

  const layout = uiSchema['ui:tab-layout'] || []

  const isRequired = (name: string) => {
    return (
      Array.isArray(schema.required) && schema.required.indexOf(name) !== -1
    );
  }

  const onPropertyChange = name => {
    return (value, errorSchema) => {
      const newFormData = { ...props.formData, [name]: value };
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
        if (params["tab_param"]) {
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

  return (
    <>
      <AppBar position="static" color="default">
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="full width tabs example"
        >
          {layout.map((tabDef, tindex) => {
            if (schema.properties[tabDef.field])
              return (<Tab icon={tabDef.icon ? (<Icon>{tabDef.icon}</Icon>) : null} label={`${tabDef.title || schema.properties[tabDef.field].title || tabDef.field}`} {...a11yProps(tindex)} />)
          })}

        </Tabs>
      </AppBar>
      <SwipeableViews
        axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
        index={value}
        onChangeIndex={handleChangeIndex}
        key={'view'}        
      >
        {layout.map((tabDef, tindex) => {
          if (schema.properties[tabDef.field])
            return (
              <TabPanel {...props} value={value} index={tindex}>
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
              </TabPanel>
            )
        })}
      </SwipeableViews>
    </>
  );
}

export default MaterialTabbedField;
