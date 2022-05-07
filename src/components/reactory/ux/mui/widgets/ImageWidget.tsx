

const default_options = { variant: 'img' };

export default ({ reactory, formData, uiSchema, idSchema, schema, formContext }) => {
  const { variant, className, styles = {} } = uiSchema['ui:options'] || default_options;

  const { React } = reactory.getComponents(['react.React']);

  switch (variant) {
    case 'div': {
      return (
        <div className={className} style={styles}></div>
      )
    }
    case 'avatar': {
      const { Material } = reactory.getComponents(['material-ui.Material']);
      const { MaterialStyles, MaterialCore } = Material;

      return (
        <MaterialCore.Avatar src={formData} className={className} style={styles}></MaterialCore.Avatar>
      )
    }
    case 'img':
    default: {
      return <img src={formData} className={className} style={styles} alt={schema.description || schema.title} />
    }
  }
};