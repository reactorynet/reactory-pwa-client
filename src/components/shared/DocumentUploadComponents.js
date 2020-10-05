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
    if (slug) try { _slug =  template(slug)(mappedProperties) ; } catch (e) { _slug = e.message; } 
    if (title) try { _title = template(title)(mappedProperties); } catch (e) { _title = e.message; } 
    if (helpTitle) try { _helpTitle = template(helpTitle)(mappedProperties) ; } catch (e) { _helpTitle = e.message; } 
    if (helpTopics) _helpTopics = helpTopics;
    if (helpTitle) try { _placeHolder = template(placeHolder)(mappedProperties); } catch ( e ) { _placeHolder = e.message;}

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



