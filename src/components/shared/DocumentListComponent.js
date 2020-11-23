import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Icon,
  Typography,
  CircularProgress
} from '@material-ui/core';

import { Query } from '@apollo/client';
import gql from 'graphql-tag';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class DocumentListWidget extends Component {

  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    label: {
      fontSize: '1em',
      color: 'rgba(0, 0, 0, 0.54)',
      marginBottom: '0.5em',
      display: 'block'
    },
    docContainer: {
      paddingTop: theme.spacing(1)
    },
    doc: {
      display: 'flex',
      alignItems: 'center',
      textDecoration: 'none',
      color: 'rgba(0, 0, 0, 0.87)',
      marginBottom: theme.spacing(0.5),
      borderBottom: '1px solid #ded8d8',
      marginLeft: theme.spacing(3),
      padding: theme.spacing(1)
    },
    docName: {
      flex: 1,
      color: 'black',
      textDecoration: 'none',
    },
    icon: {
      color: theme.palette.primary.main,
      marginRight: theme.spacing(1)
    },
    deleteButton: {
      color: '#f24646',
      fontWeight: 'bold',
      border: 'none',
      backgroundColor: 'transparent'
    }
  });

  static propTypes = {
    formData: PropTypes.any,
    uiSchema: PropTypes.object,
  }

  static defaultProps = {}

  state = {
    documents: [],
    isLoading: true,
    isDeleting: false,
  }

  constructor(props, context) {
    super(props, context);
    this.getDocuments = this.getDocuments.bind(this);
  }

  componentDidMount = () => {
    this.getDocuments();
  }

  getDocuments = () => {
    const { query, propertyMap } = this.props.uiSchema['ui:options'];
    const variables = propertyMap ? objectMapper(this.props, propertyMap) : null;
    this.setState({ isLoading: true });

    this.props.api.graphqlQuery(query.text, variables).then((result) => {
      if (result && result.data && result.data[query.name]) {
        this.setState({
          documents: result.data[query.name],
          isLoading: false,
          error: null,
        })
      } else {
        this.setState({
          documents: [],
          isLoading: false,
          error: null,
        })
      }
    }).catch((error) => {
      this.setState({ isLoading: false, documents: [] });
      this.props.api.createNotification(`Error ${query.name} Failed!`, { showInAppNotification: true, type: 'error' });
    });

  }

  deleteDocument = (_id) => {
    const { mutation } = this.props.uiSchema['ui:options'];
    this.setState({ isDeleting: true });
    this.props.api.graphqlMutation(gql(mutation.text), { id: _id })
      .then((deleteResult) => {
        if (deleteResult && deleteResult.data && deleteResult.data[mutation.name]) {
          let updatedDocuments = [...this.state.documents];
          updatedDocuments = updatedDocuments.filter(doc => doc.id != _id);
          this.setState({ isDeleting: false, documents: updatedDocuments });
          this.props.api.createNotification(`Document successfully deleted`, { showInAppNotification: true, type: 'success' });
        } else {
          console.log('COULD NOT DELETE DOCUMENT');
          this.setState({ isDeleting: false });
        }
      }).catch((error) => {
        this.setState({ isDeleting: false });
        this.props.api.createNotification(`Error ${mutation.name} Failed!`, { showInAppNotification: true, type: 'error' });
      });
  }

  render() {
    const self = this
    const { classes, api } = this.props;
    const { label } = this.props.uiSchema['ui:options'];
    let _label = label || '';

    this.props.api.log('RENDERING DOCUMENTS LIST COMPONENT', {}, 'debug');

    return (
      <>
        {_label != '' && <label className={classes.label}>{_label}</label>}
        <div className={classes.docContainer}>
          {
            this.state.documents.length > 0 ?
              this.state.documents.map(doc => {
                return (
                  <div key={doc.id} className={classes.doc}>
            <Icon fontSize="30" classes={{ root: classes.icon }}>description</Icon>
            <a className={classes.docName} href={doc.url} target="_blank" >
              <Typography variant="subtitle1">{doc.name}</Typography>
            </a>
            {
              !this.state.isDeleting ? <button className={classes.deleteButton} onClick={() => this.deleteDocument(doc.id)}>Remove</button> :
                <CircularProgress style={{ color: '#f24646', height: '1rem', width: '1rem', marginRight: '1rem' }} />
            }
          </div>
                )
              }) : <p style={{ margin: '0 0 0 16px' }}>{ this.state.loading ? 'Loading... ' : 'No Documents Available'}</p>
          }
        </div>
      </>
    )
  }
}
const DocumentListComponent = compose(withApi, withTheme, withStyles(DocumentListWidget.styles))(DocumentListWidget)
export default DocumentListComponent;

