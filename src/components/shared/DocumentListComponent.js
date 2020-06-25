import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Chip,
  Icon,
  Typography
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
      paddingLeft: theme.spacing(3),
      paddingTop: theme.spacing(1)
    },
    doc: {
      display: 'flex',
      alignItems: 'centre',
      textDecoration: 'none',
      color: 'rgba(0, 0, 0, 0.87)',
      marginBottom: theme.spacing(0.5)
    },
    icon: {
      color: theme.palette.primary.main,
      marginRight: theme.spacing(1)
    }
  });

  static propTypes = {
    formData: PropTypes.any,
    uiSchema: PropTypes.object,
  }

  static defaultProps = {}

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const self = this
    const { classes, formContext, formData, required, api, theme } = this.props;


    api.log('RENDERING DOCUMENTS LIST COMPONENT', { formContext, formData }, 'debug');

    const { query, propertyMap, resultsMap, resultItem, multiSelect, label } = this.props.uiSchema['ui:options'];
    const variables = propertyMap ? objectMapper(this.props, propertyMap) : null;
    let _label = label || 'Documents';

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
              <label className={classes.label}>{_label}</label>
              <div className={classes.docContainer}>
                {
                  documents.length > 0 ?
                    documents.map(doc => {
                      return (
                        <a href={doc.url} target="_blank" className={classes.doc}>
                          <Icon fontSize="30" classes={{ root: classes.icon }}>description</Icon>
                          <Typography style={{ color: 'black' }} variant="subtitle1">{doc.id} {doc.name}</Typography>
                        </a>
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



