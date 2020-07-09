import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Icon,
  Typography
} from '@material-ui/core';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';

class DocumentUploadWidget extends Component {

  state = {
    uploadedDocuments: [],
    isDeleting: false
  }

  constructor(props, context) {
    super(props, context);

    this.componentDefs = this.props.api.getComponents([
      'core.Loading',
      'core.StaticContent',
    ]);

  }

  render() {
    const self = this
    const { StaticContent } = this.componentDefs;
    const { classes, theme, api, uiSchema } = this.props;

    let _slug = '';
    let _title = '';
    let _helpTopics = [];
    let _helpTitle = '';
    let _placeHolder = 'Add a customized comment.';

    api.log('RENDERING DOCUMENTS UPLOAD COMPONENT');

    const uiOptions = uiSchema['ui:options'];
    const mappedProperties = uiOptions.propertyMap ? api.utils.objectMapper(this.props, uiOptions.propertyMap) : {};
    const { slug, title, mode = 'editing', helpTitle, helpTopics, placeHolder, form } = uiOptions.props;
    if (slug) _slug = template(slug)(mappedProperties);
    if (title) _title = template(title)(mappedProperties);
    if (helpTitle) _helpTitle = template(helpTitle)(mappedProperties);
    if (helpTopics) _helpTopics = helpTopics;
    if (helpTitle) _placeHolder = template(placeHolder)(mappedProperties);

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
      onMutationCompleteHandler: this.getUploadedDocuments
    };

    return (
      <>
        <StaticContent {...staticContentProps} ></StaticContent>
      </>
    )
  }
}

DocumentUploadWidget.styles = (theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
});

DocumentUploadWidget.propTypes = {
  formData: PropTypes.any,
  uiSchema: PropTypes.object,
}

DocumentUploadWidget.defaultProps = {}

const DocumentUploadComponent = compose(withApi, withTheme, withStyles(DocumentUploadWidget.styles))(DocumentUploadWidget)
export default DocumentUploadComponent;



