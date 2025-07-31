import { useReactory } from "@reactory/client-core/api";
import { ReactoryStaticContentComponent } from "@reactory/client-core/components/shared/StaticContent";

export const StaticContentWidget = (props: any) => {

  const { idSchema, uiSchema, formContext, formData, schema } = props;
  const reactory = useReactory();
  const {
    StaticContent,
    React
  } = reactory.getComponents<{ React: Reactory.React, StaticContent: typeof ReactoryStaticContentComponent }>(['core.StaticContent', 'material-ui.MaterialCore', 'react.React']);

  const DefaultOptions: any = { 
    editAction: "inline",
    placeHolder: "",
    slug: "default"
  };

  const options = uiSchema && uiSchema['ui:options'] ? { ...DefaultOptions, ...uiSchema['ui:options'] } : DefaultOptions;
  let aipersona = { ...(uiSchema?.['ui:ai'] || null) };

  if (aipersona) { 
    if(aipersona.propsMap) {
      let aiProps = {...aipersona.props};
      const mappedProps = reactory.utils.objectMapper.merge({
        formContext, 
        reactory, 
        formData,
        uiSchema,
        schema,
        aiProps, 
      }, aipersona.propsMap);      

      aipersona.props = {
        ...aiProps,
        ...mappedProps
      };
    }
  }

  const slugSourceProps = options.slugSourceProps ? { 
    ...options.slugSourceProps, 
    basePath: reactory.utils.template(options.slugSourceProps.basePath)({ ...props, reactory }) } : null;
  return (<StaticContent 
    id={idSchema.$id}
    slug={reactory.utils.template(options.slug)({ ...props, reactory })} 
    slugSourceProps={slugSourceProps}
    propertyBag={{ ...props, reactory }} 
    editAction={ options.editAction } 
    useExpanded={ options.useExpanded || false }
    expanded={ options.expanded || false }
    container={options.container || 'Box' }
    containerProps={options.containerProps || {}}
    aipersona={aipersona}
    />);
}

export default {
  name: 'StaticContentWidget',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: StaticContentWidget,
  roles: ['USER'],
  tags: ['user', 'homepage']
};