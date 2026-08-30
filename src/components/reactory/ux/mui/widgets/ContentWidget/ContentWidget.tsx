import React from 'react';
import { useReactory } from '@reactory/client-core/api';
import { ContentRenderer } from '@reactory/client-core/components/shared/ContentRenderer';

const ContentWidget = (props: any) => {
  const { formData, schema, uiSchema, formContext, id: propId } = props;
  const reactory = useReactory();
  const content = formData || '';

  const options = uiSchema?.['ui:options'] || {};
  const {
    sx,
    enableComments = false,
    contentId,
    context = 'ReactoryFormContent',
    commentLayout = 'bottom',
    commentsProps,
  } = options;

  // Resolve ID from options, props, or formContext
  const resolvedId = contentId || propId || formContext?.id || formContext?.documentId;

  return (
    <ContentRenderer
      content={content}
      id={resolvedId}
      enableComments={enableComments}
      context={context}
      commentLayout={commentLayout}
      commentsProps={commentsProps}
      sx={{ padding: 2, ...sx }}
      reactory={reactory}
    />
  );
};

export default ContentWidget;
