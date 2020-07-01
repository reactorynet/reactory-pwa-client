import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Icon,
  Typography,
  CircularProgress
} from '@material-ui/core';

import { Query } from 'react-apollo';
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
    isDeleting: false
  }

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const self = this
    const { classes, formContext, formData, required, api, theme } = this.props;

    api.log('RENDERING DOCUMENTS LIST COMPONENT', { formContext, formData }, 'debug');

    const { query, mutation, propertyMap, resultsMap, resultItem, multiSelect, label } = this.props.uiSchema['ui:options'];
    const variables = propertyMap ? objectMapper(this.props, propertyMap) : null;
    let _label = label || '';


    const deleteDocument = (_id) => {

      this.setState({ isDeleting: true });

      api.graphqlMutation(gql(mutation), { id: _id }).then((deleteResult) => {

        console.log('DOCUMENT DELETE RESULT', deleteResult)

        this.setState({ isDeleting: false });

       // NEED TO REFRESH PAGE - REMOVE DELETED ITEM

      }).catch((error) => {

        console.error('ERROR DELETING DOCUMENT', error)
        this.setState({ isDeleting: false });

      })

    }

    return (
      <Query query={gql`${query}`} variables={variables} >
        {(props, context) => {
          const { data, loading, error } = props;
          if (loading === true) return (<p>Loading documents</p>)
          if (error) return (<p>Error Loading documents: {error}</p>)
          let documents = [];
          if (data && data[resultItem]) documents = resultsMap ? objectMapper(data, resultsMap) : data[resultItem];
          return (
            <>
              { label != '' && <label className={classes.label}>{_label}</label> }
              <div className={classes.docContainer}>
                {
                  documents.length > 0 ?
                    documents.map(doc => {
                      return (
                        <div key={doc.id} className={classes.doc}>
                          <Icon fontSize="30" classes={{ root: classes.icon }}>description</Icon>
                          <a className={classes.docName} href={doc.url} target="_blank" >
                            <Typography variant="subtitle1">{doc.name}</Typography>
                          </a>
                          {
                            !this.state.isDeleting ? <button className={classes.deleteButton} onClick={() => deleteDocument(doc.id)}>Remove</button> :
                              <CircularProgress style={{color: '#f24646', height: '1rem', width: '1rem', marginRight: '1rem'}} />
                          }

                        </div>
                      )
                    }) : <p style={{ margin: 0 }}>No Documents Available</p>
                }
              </div>
            </>
          )
        }}
      </Query>
    )
  }
}
const DocumentListComponent = compose(withApi, withTheme, withStyles(DocumentListWidget.styles))(DocumentListWidget)
export default DocumentListComponent;



