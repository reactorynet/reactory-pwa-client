import { useReactory } from "@reactory/client-core/api";

export const StaticContent = (props: any) => {

  const { formData, formContext, idSchema, uiSchema } = props;
  const reactory = useReactory();
  const {
    StaticContent,
    React
  } = reactory.getComponents(['core.StaticContent', 'material-ui.MaterialCore', 'react.React']);

  const DefaultOptions: any = { 
    editAction: "inline",
    placeHolder: "",
    slug: "default"
  };

  const options = uiSchema && uiSchema['ui:options'] ? { ...DefaultOptions, ...uiSchema['ui:options'] } : DefaultOptions;

  return (<StaticContent 
    id={idSchema.$id}
    slug={reactory.utils.template(options.slug)({ ...props, reactory })} 
    propertyBag={{ ...props, reactory }} 
    editAction={ options.editAction } 
    />);
}

export default {
  name: 'StaticContentWidget',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: StaticContent,
  roles: ['USER'],
  tags: ['user', 'homepage']
};