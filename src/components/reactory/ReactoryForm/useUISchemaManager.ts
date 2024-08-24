import { useReactory } from "@reactory/client-core/api";
import { ScreenSizeKey } from "./types";

export const useUISchemaManager = (props: Reactory.Client.IReactoryFormProps) => {
  const reactory = useReactory();
  const queryData: any =
    reactory.utils.queryString.parse(window.location.search) || {};

  const { formDefinition } = props;
  const { 
    uiSchemas,
  } = formDefinition; 

  const getScreenSize = () => {
    let _response: ScreenSizeKey = "md";
    return _response;
  };


const AllowedSchemas = (uiSchemaItems: Reactory.Forms.IUISchemaMenuItem[], mode = 'view', size = 'md'): Reactory.Forms.IUISchemaMenuItem[] => {
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

    return mode_pass === true && size_pass === true && min_width_pass === true;
  });
};

  const getInitialUiSchemaKey = () => {
    return queryData.uiSchemaKey || props.uiSchemaKey || "default";
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

  return {
    uiSchema: getActiveUiSchema() as Reactory.Schema.IFormUISchema,
    uiOptions: getActiveUiOptions(),
    uiSchemaActiveMenuItem: getInitialActiveMenuItem(),
    uiSchemasAvailable: AllowedSchemas(uiSchemas),
    uiSchemaActiveGraphDefintion: getActiveGraphDefinitions(),
    uiSchemaSelectorButtons: GetSchemaSelectorMenus(),
  };
};
