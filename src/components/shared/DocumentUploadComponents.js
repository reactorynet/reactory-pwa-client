import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Icon,
  Typography
} from '@material-ui/core';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class DocumentUploadWidget extends Component {

  state = {
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
    const { classes, theme, api } = this.props;

    api.log('RENDERING DOCUMENTS UPLOAD COMPONENT');

    let slug = 'fileuploadtest';
    let title = 'Title Will Be Dynamic';

    const staticContentProps = {
      canEdit: ["owner"],
      editRoles: ['USER', 'DEVELOPER'],
      viewMode: "minimal",
      autoSave: ['onChange'],
      throttle: 500,
      isEditing: true,
      showEditIcon: false,
      helpTopics: [`mores-assessment-help-personalized-comment-relpacewithsug`],
      helpTitle: `Adding a comment to Replace with Title`,
      mode: 'edit',
      title: `Section TITLEGOESHERE Comment by...`,
      slug: `mores-survey-SLUGGOESHERE-assessment`,
      placeHolder: `Add a customized comment for`,
    };

    return (
      <StaticContent {...staticContentProps} ></StaticContent>
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



