import React, { Component } from 'react';
import { Styles } from '@mui/styles/withStyles/withStyles';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import {
  Grid,
  Typography,
  Icon,
  Theme
} from '@mui/material';

import IntersectionVisible from '../utility/IntersectionVisible';


const styles = (theme: Theme) => {
  return {
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2)
    },
    spinning: {
      animation: 'spin 3s infinite',
    },
  }
}

const GridLayoutWidget = (props) => {

  

  const [state, _setState] = React.useState({
    data: [],
    page: 0,
    pageSize: 10,
    totalCount: 0,
    loadingData: true,
    variables: {}
  });

  const setState = (newState: any) => {
    _setState((prevState) => ({ ...prevState, ...newState }));
  }

  const componentDefs: any = props.reactory.getComponents(['core.Loading']);
  const getData = React.useCallback(async () => {

    const self = props;
    const { props: componentProps } = props;
    const { formData, uiSchema, reactory, formContext } = componentProps;
    const uiOptions = uiSchema["ui:options"] || {};

    if (uiOptions.remoteData === true) {
      try {


        setState({ loadingData: true });
        const graphqlDefinitions = formContext.$formState.formDef.graphql;
        if (graphqlDefinitions.query || graphqlDefinitions.queries) {
          let queryDefinition = graphqlDefinitions.query;

          let variables;
          if (state.data.length == 0) {
            variables = reactory.utils.objectMapper(self, uiOptions.variables);
            setState({
              page: variables.paging.page,
              pageSize: variables.paging.pageSize,
              variables: { ...variables }
            });
          } else {
            variables = { ...state.variables, paging: { page: state.page, pageSize: state.pageSize } }
          }

          reactory.log('GRIDLAYOUTWIDGET - Mapped variables for query', { variables });

          const queryResult = await reactory.graphqlQuery(queryDefinition.text, variables).then();


          if (queryResult.errors && queryResult.errors.length > 0) {
            reactory.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
            setState({ data: [], page: 0, totalCount: 0, loadingData: false });
          } else {


            let result = reactory.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap);
            setState((prevState) => ({ data: prevState.data.concat(result.data), page: result.page + 1, totalCount: result.totalCount, loadingData: false }));
          }
        } else {
          setState({ data: [], page: 0, totalCount: 0, loadingData: false });
        }
      } catch (remoteDataError) {
        setState({ data: [], page: 0, totalCount: 0, loadingData: false });
      }
    } else {
      let data = [];
      if (formData && formData.length) {
        formData.forEach(row => {
          data.push({ ...row })
        });
        setState({ data: data, page: 0, totalCount: 0, loadingData: false });
      }
    }

  }, [props, state.data.length, state.page, state.pageSize, state.variables]);

  React.useEffect(() => {
    getData();
  }, [getData]);

  const onShow = React.useCallback(() => {
    if (!state.loadingData) getData();
  }, [state.loadingData, getData]);

  const {reactory, uiSchema } = props;
  const uiOptions = uiSchema["ui:options"] || {};
  const { Loading } = componentDefs;

  const loadingMessage = uiOptions.loadingMessage ? uiOptions.loadingMessage : 'Loading product dimensions, please wait a moment';

  let ChildComponent = reactory.getComponent(uiOptions.component);
  let componentProps = {};
  if (uiOptions.componentProps)
    componentProps = { ...uiOptions.componentProps };

  return (
    <>
      <Grid container spacing={2} >
        {state.loadingData && state.data.length == 0 && <Loading message={loadingMessage} />}
        {
          state.data.map((itemData, index) => {
            componentProps = { ...componentProps, data: itemData }
            return (<Grid item xs={12} sm={6} md={4} key={index} ><ChildComponent {...componentProps} /></Grid>)
          })
        }
      </Grid>
      {props.children}
      {
        state.loadingData && state.data.length > 0 &&
        <Typography classes={{ root: props.classes.loading }} variant={'h6'} align="center">Loading more &nbsp;<Icon className={props.classes.spinning} color="primary">autorenew</Icon></Typography>
      }
      {!state.loadingData && state.data.length > 0 && state.data.length < state.totalCount && <IntersectionVisible onShow={onShow}>
        <Typography classes={{ root: props.classes.loading }} variant={'h6'}>Load More</Typography>
      </IntersectionVisible>}
    </>
  );
};

const GridLayoutComponent = compose(withReactory, withStyles(styles))(GridLayoutWidget);
export default GridLayoutComponent;

