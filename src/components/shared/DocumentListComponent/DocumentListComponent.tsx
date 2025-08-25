import React, { Fragment } from 'react'
import { pullAt, find, isNil, isEmpty } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Icon,
  Typography,
  CircularProgress
} from '@mui/material';
import gql from 'graphql-tag';
import { compose } from 'redux'
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const DocumentListWidget = (props: any) => {
  const theme = useTheme();
  const [documents, setDocuments] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    getDocuments();
  }, []);

  const getDocuments = () => {
    const { query, propertyMap } = props.uiSchema['ui:options'];
    const variables = propertyMap ? objectMapper(props, propertyMap) : null;
    setIsLoading(true);

    props.api.graphqlQuery(query.text, variables).then((result) => {
      if (result && result.data && result.data[query.name]) {
        setDocuments(result.data[query.name]);
        setIsLoading(false);
      } else {
        setDocuments([]);
        setIsLoading(false);
      }
    }).catch((error) => {
      setIsLoading(false);
      setDocuments([]);
      props.api.createNotification(`Error ${query.name} Failed!`, { showInAppNotification: true, type: 'error' });
    });

  }

  const deleteDocument = (_id) => {
    const { mutation } = props.uiSchema['ui:options'];
    setIsDeleting(true);
    props.api.graphqlMutation(gql(mutation.text), { id: _id })
      .then((deleteResult) => {
        if (deleteResult && deleteResult.data && deleteResult.data[mutation.name]) {
          let updatedDocuments = [...documents];
          updatedDocuments = updatedDocuments.filter(doc => doc.id != _id);
          setIsDeleting(false);
          setDocuments(updatedDocuments);
          props.api.createNotification(`Document successfully deleted`, { showInAppNotification: true, type: 'success' });
        } else {
          console.log('COULD NOT DELETE DOCUMENT');
          setIsDeleting(false);
        }
      }).catch((error) => {
        setIsDeleting(false);
        props.api.createNotification(`Error ${mutation.name} Failed!`, { showInAppNotification: true, type: 'error' });
      });
  };

  const { api } = props;
  const { label } = props.uiSchema['ui:options'];
  let _label = label || '';

  props.api.log('RENDERING DOCUMENTS LIST COMPONENT', {});

  return (
    <>
      {_label != '' && <label style={{ fontSize: '1em', color: 'rgba(0, 0, 0, 0.54)', marginBottom: '0.5em', display: 'block' }}>{_label}</label>}
      <div style={{ paddingTop: theme.spacing(1) }}>
        {
          documents.length > 0 ?
            documents.map(doc => {
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'rgba(0, 0, 0, 0.87)', marginBottom: theme.spacing(0.5), borderBottom: '1px solid #ded8d8', marginLeft: theme.spacing(3), padding: theme.spacing(1) }}>
          <Icon fontSize="inherit" style={{ color: theme.palette.primary.main, marginRight: theme.spacing(1) }}>description</Icon>
          <a style={{ flex: 1, color: 'black', textDecoration: 'none' }} href={doc.url} target="_blank" >
            <Typography variant="subtitle1">{doc.name}</Typography>
          </a>
          {
            !isDeleting ? <button style={{ color: '#f24646', fontWeight: 'bold', border: 'none', backgroundColor: 'transparent' }} onClick={() => deleteDocument(doc.id)}>Remove</button> :
              <CircularProgress style={{ color: '#f24646', height: '1rem', width: '1rem', marginRight: '1rem' }} />
          }
        </div>
              )
            }) : <p style={{ margin: '0 0 0 16px' }}>{ isLoading ? 'Loading... ' : 'No Documents Available'}</p>
        }
      </div>
    </>
  );
};

const DocumentListComponent = compose(withReactory)(DocumentListWidget);
export default DocumentListComponent;

