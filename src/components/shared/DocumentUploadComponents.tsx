import React, { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  Icon,
  Typography
} from '@mui/material';
import { compose } from 'redux'
import { withStyles, withTheme, StyleRulesCallback } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';

const styles: StyleRulesCallback<any, any, string> = (theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap' as 'wrap',
  },
});

function DocumentUploadWidget(props: any) {
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Defensive: reactory and getComponents may not exist
  const componentDefs = useMemo(() => {
    try {
      return props.reactory?.getComponents([
        'core.Loading',
        'core.StaticContent',
      ]) || {};
    } catch (e) {
      if (props.reactory?.log) props.reactory.log('Error getting components', e);
      return {};
    }
  }, [props.reactory]);

  const { StaticContent } = componentDefs;
  const { classes, theme, reactory, uiSchema } = props;

  let _slug = '';
  let _title = '';
  let _helpTopics = [];
  let _helpTitle = '';
  let _placeHolder = 'Add a customized comment.';

  try {
    reactory?.log?.('RENDERING DOCUMENTS UPLOAD COMPONENT');
  } catch (e) {
    // ignore logging errors
  }

  let uiOptions: any = {};
  let mappedProperties = {};
  let optionsProps: any = {};
  try {
    uiOptions = uiSchema?.['ui:options'] || {};
    mappedProperties = uiOptions.propertyMap ? reactory?.utils?.objectMapper(props, uiOptions.propertyMap) : {};
    optionsProps = uiOptions.props || {};
  } catch (e) {
    // fallback to defaults
    uiOptions = {};
    mappedProperties = {};
    optionsProps = {};
  }

  const {
    slug,
    title,
    mode = 'editing',
    helpTitle,
    helpTopics,
    placeHolder,
    form
  } = optionsProps;

  if (slug) try { _slug = template(slug)(mappedProperties); } catch (e) { _slug = e.message; }
  if (title) try { _title = template(title)(mappedProperties); } catch (e) { _title = e.message; }
  if (helpTitle) try { _helpTitle = template(helpTitle)(mappedProperties); } catch (e) { _helpTitle = e.message; }
  if (helpTopics) _helpTopics = helpTopics;
  if (placeHolder) try { _placeHolder = template(placeHolder)(mappedProperties); } catch (e) { _placeHolder = e.message; }

  const staticContentProps = {
    canEdit: ["owner"],
    editRoles: ['USER', 'DEVELOPER'],
    viewMode: "minimalExtended",
    autoSave: ['onChange'],
    throttle: 500,
    isEditing: false,
    showEditIcon: true,
    helpTopics: _helpTopics,
    helpTitle: _helpTitle,
    mode: mode,
    title: _title,
    slug: _slug,
    placeHolder: _placeHolder,
  };

  if (!StaticContent) {
    return <Typography color="error">StaticContent component not available.</Typography>;
  }

  return (
    <>
      <StaticContent {...staticContentProps} />
    </>
  );
}

const DocumentUploadComponent = compose(withReactory, withTheme, withStyles(styles))(DocumentUploadWidget)
export default DocumentUploadComponent;



