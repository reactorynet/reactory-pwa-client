import React, { useEffect, useState } from 'react'
import { useContentRender } from '@reactory/client-core/components/shared/ReactorChat/hooks/useContentRender'
import { useReactory } from '@reactory/client-core/api'

const ContentWidget = (props) => {
  const { formData, schema, uiSchema, formContext } = props;
  const reactory = useReactory();
  const content = formData || "";
  const { Material } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule;
  }>(["material-ui.Material"]);
  
  const { renderContent } = useContentRender(reactory);
  const { MaterialCore } = Material;
  const { sx } = uiSchema?.['ui:options'] || {};
  return (
    <MaterialCore.Box sx={{ padding: 2, ...sx }}>
      {renderContent(content)}
    </MaterialCore.Box>
  );
};

export default ContentWidget;