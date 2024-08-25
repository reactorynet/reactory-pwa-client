import { useReactory } from "@reactory/client-core/api";
import { ReactoryFormUISchemaManagerHook, ScreenSizeKey } from "./types";

export const useUISchemaManager: ReactoryFormUISchemaManagerHook<unknown> = ({  
  formDefinition,
  uiSchemaKey = 'default',
  mode = 'view',
  params = {},
}) => {
  const reactory = useReactory();
  const queryData: any =
    reactory.utils.queryString.parse(window.location.search) || {};
  
  const { 
    uiSchemas,
  } = formDefinition; 

  const getScreenSize = () => {
    let _response: ScreenSizeKey = "md";
    return _response;
  };


const AllowedSchemas = (uiSchemaItems: Reactory.Forms.IUISchemaMenuItem[],
  mode: string = 'view', 
  size: ScreenSizeKey = 'md'): Reactory.Forms.IUISchemaMenuItem[] => {
  return reactory.utils.lodash.filter(uiSchemaItems, item => {
    let mode_pass = false;
    let size_pass = false;
    let min_width_pass = false;

    if (item.modes === null || item.modes === undefined) mode_pass = true;
    else if (item.modes.indexOf(mode) >= 0) {
      mode_pass = true;
    }

    if (item.sizes === null || item.sizes === undefined) size_pass = true;
    else if (item.sizes.indexOf(size) >= 0) {
      size_pass = true;
    }

    if (item.minWidth === null || item.minWidth === undefined) min_width_pass = true;
    else if (window.innerWidth >= item.minWidth) min_width_pass = true;

    return mode_pass === true 
      && size_pass === true 
      && min_width_pass === true;
  });
};

  const getInitialUiSchemaKey = () => {
    return queryData.uiSchemaKey || uiSchemaKey
  };

  const getInitialActiveMenuItem = (): Reactory.Forms.IUISchemaMenuItem => {
    const key = getInitialUiSchemaKey();

    if (formDefinition === undefined) return null;

    //if (formDef?.id ==='core.SupportTickets@1.0.0')

    let allowed_schemas = AllowedSchemas(
      formDefinition.uiSchemas,
      mode,
      getScreenSize()
    );

    let matched_schema = allowed_schemas.find((menu_item) => {
      return menu_item.key === key;
    });

    if (matched_schema) return matched_schema;

    if (allowed_schemas.length > 0) {
      return allowed_schemas[0];
    }

    return {
      id: "default",
      key: "default",
      uiSchema:
        (formDefinition.uiSchema as Reactory.Schema.IFormUISchema) || {},
      description: "Default active menu item",
      title: "Default",
      icon: "form",
    };
  };

  /**
   * Determines what is the correct uiSchema to use for the form based on order of importance.
   * User Preference overrides other values
   * Route param overrides form props / state
   * Form state overrides props
   * props is initial and base values
   * @returns
   */
  const getActiveUiSchema = () => {
    if (formDefinition === undefined) return {};

    if (activeUiSchemaMenuItem !== null) {
      return activeUiSchemaMenuItem.uiSchema;
    }

    if (
      formDefinition.uiSchemas === null ||
      formDefinition.uiSchemas === undefined
    )
      return formDefinition.uiSchema || {};
    if (
      Array.isArray(formDefinition.uiSchemas) === true &&
      formDefinition.uiSchemas.length === 0
    )
      return formDefinition.uiSchema || {};

    let allowed_schemas = AllowedSchemas(
      formDefinition.uiSchemas,
      mode,
      getScreenSize()
    );
    const qargs = queryString.parse(location.search);
    let matched_schema = allowed_schemas.find((menu_item, index) => {
      return (
        menu_item.key === props.uiSchemaKey ||
        menu_item.id === props.uiSchemaId ||
        qargs.uiSchemaKey === menu_item.key ||
        qargs.uiSchemaId === menu_item.id
      );
    });

    if (matched_schema) return matched_schema.uiSchema;

    return formDefinition.uiSchema;
  };

  const getActiveUiOptions = (): Reactory.Schema.IFormUIOptions => {
    let _options = { showSchemaSelectorInToolbar: true };
    let _uiSchema: Reactory.Schema.IFormUISchema =
      getActiveUiSchema() as Reactory.Schema.IFormUISchema;

    if (_uiSchema && _uiSchema["ui:form"]) {
      _options = { ..._options, ..._uiSchema["ui:form"] };
    } else {
      //fallback
      if (
        _uiSchema &&
        _uiSchema["ui:options"] &&
        typeof _uiSchema["ui:options"] === "object"
      ) {
        _options = { ..._options, ..._uiSchema["ui:options"] };
      }
    }
    return _options;
  };

  const getActiveGraphDefinitions = () => { };

  const GetSchemaSelectorMenus = () => {
    const allowed_schema = AllowedSchemas(formDefinition.uiSchemas, props.mode, null)
    reactory.log(`<${fqn} /> GetSchemaSelectorMenus`, { allowed_schema });

    // allowed_schema.forEach((uiSchemaItem: Reactory.IUISchemaMenuItem, index: number) => {
    const schemaButtons = allowed_schema.map((uiSchemaItem: Reactory.Forms.IUISchemaMenuItem, index: number) => {
      /**  We hook uip the event handler for each of the schema selection options. */
      const onSelectUiSchema = () => {
        // self.setState({ activeUiSchemaMenuItem: uiSchemaItem })
        reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${uiSchemaItem.title}" selected`, { uiSchemaItem });
        setActiveUiSchemaMenuItem(uiSchemaItem);
      };

      return <IconButton onClick={onSelectUiSchema} key={`schema_selector_${index}`} size="large"><Icon>{uiSchemaItem.icon}</Icon></IconButton>;
    });

    return schemaButtons;

  };

  // Even handler for the schema selector menu
  const onSchemaSelect = (evt: Event, menuItem: Reactory.Forms.IUISchemaMenuItem) => {
    reactory.log(`UI Schema Selector onSchemaSelect "${menuItem.title}" selected`, { evt, menuItem });
    let doQuery = false;
    if (menuItem.graphql) {
      doQuery = true
    }
    if (menuItem && menuItem.uiSchema) {
      if (menuItem.uiSchema['ui:graphql']) {
        doQuery = true;
      }
    } else {
      //the uiSchema is null? now what?
      reactory.log(`Null uiSchema?`, { menuItem });;
    }

    setActiveUiSchemaMenuItem(menuItem);
    if (doQuery === true) {
      setQueryComplete(false);
      setIsBusy(false);
      setIsDirty(false);
    }
  };

  

  return {
    uiSchema: getActiveUiSchema() as Reactory.Schema.IFormUISchema,
    uiOptions: getActiveUiOptions(),
    uiSchemaActiveMenuItem: getInitialActiveMenuItem(),
    uiSchemasAvailable: AllowedSchemas(uiSchemas),
    uiSchemaActiveGraphDefintion: getActiveGraphDefinitions(),
    uiSchemaSelectorButtons: GetSchemaSelectorMenus(),
    onUISchemaSelect: onSchemaSelect,
    uiSchemaSelector: null,
  };
};



/**
 * 
//  * /**
//      * If the form supports multiple schemas,
//      * we need to determine which is the preffered, currently
//      * active one.
//      */
// if (uiSchemasAvailable && uiSchemasAvailable.length > 0) {
//   if (uiSchemaActiveMenuItem) {
//     uiSchemaSelector = (
//       <Fragment>
//         {activeUiSchemaModel.title}
//         <DropDownMenu              
//           menus={uiSchemasAvailable} 
//           onSelect={onUISchemaSelect} 
//           selected={uiSchemaActiveMenuItem} />
//       </Fragment>);
//   }


//   if (uiOptions?.schemaSelector) {
//     if (uiOptions.schemaSelector.variant === "icon-button") {


//       let schemaStyle: CSSProperties = {};
//       if (uiOptions.schemaSelector?.style) {
//         schemaStyle = uiOptions.schemaSelector.style;
//       }

//       uiSchemaSelector = (
//         <div style={schemaStyle}>
//           {
//             uiOptions.schemaSelector &&
//             uiOptions.schemaSelector.showTitle === false ? null : (<span>
//                 {activeUiSchemaModel.title}
//               </span>)
//           }
//           {uiSchemaSelectorButtons}
//         </div>
//       )

//     }

//     if (uiOptions.schemaSelector.variant === "button") {
//       const onSelectUiSchema = () => {
//         const selectedSchema: Reactory.Forms.IUISchemaMenuItem = find(formDefinition.uiSchemas, { id: uiOptions.schemaSelector.selectSchemaId });

//         reactory.log(`<${fqn} /> UI Schema Selector onSchemaSelect "${selectedSchema.title}" selected`, { selectedSchema });
//         // TODO - this needs to be tested
//         setActiveUiSchemaMenuItem(selectedSchema);
//       };

//       // let defaultStyle =
//       let schemaStyle: CSSProperties = { position: "absolute", top: '10px', right: '10px', zIndex: 1000 };
//       if (uiOptions.schemaSelector.style) {
//         schemaStyle = {
//           ...schemaStyle,
//           ...uiOptions.schemaSelector.style
//         }
//       }

//       let buttonStyle = {
//         ...uiOptions.schemaSelector.buttonStyle
//       };

//       let p = {
//         style: schemaStyle
//       }

//       let _before = [];
//       let _after = []

//       if (uiOptions.schemaSelector.components) {
//         uiOptions.schemaSelector.components.forEach((componentRef: string | object) => {
//           if (typeof componentRef === 'string') {
//             if (componentRef.indexOf(".") > 0) {
//               const ComponentInSchemaSelector = reactory.getComponent<any>(componentRef);
//               if (ComponentInSchemaSelector) {
//                 //@ts-ignore
//                 _after.push(<ComponentInSchemaSelector formData={formData} formContext={formProps.formContext} uiSchema={formProps.uiSchema} schema={formProps.schema} />)
//               }
//             } else {
//               switch (componentRef) {
//                 case "submit": {
//                   _after.push(submitButton)
//                   break;
//                 }
//                 case "help": {

//                   break;
//                 }
//                 case "refresh": {

//                   break;
//                 }
//                 case "export": {

//                   break;
//                 }
//                 case "import": {

//                   break;
//                 }
//               }
//             }
//           }
//         });
//       }


//       uiSchemaSelector = (
//         //@ts-ignore
//         <div {...p}>
//           {_before}
//           {
//             uiOptions.schemaSelector.buttonVariant ?
//               //@ts-ignore
//               <Button
//                 id="schemaButton"
//                 onClick={onSelectUiSchema}
//                 color={uiOptions.schemaSelector.activeColor ? uiOptions.schemaSelector.activeColor : "primary"}
//                 variant={uiOptions.schemaSelector.buttonVariant}
//                 style={buttonStyle}
//               >{uiOptions.schemaSelector.buttonTitle}</Button> :
//               <Button
//                 id="schemaButton"
//                 style={{ fontWeight: 'bold', fontSize: '1rem' }}
//                 onClick={onSelectUiSchema}
//                 //@ts-ignore
//                 color={uiOptions.schemaSelector.activeColor ? uiOptions.schemaSelector.activeColor : "primary"}
//               >{uiOptions.schemaSelector.buttonTitle}</Button>
//           }
//           {_after}
//         </div>
//       )

//     }
//   }

//   formProps.formContext.$schemaSelector = uiSchemaSelector;
// }
//  * 
//  * */