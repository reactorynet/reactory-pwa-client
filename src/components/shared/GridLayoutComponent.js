import React, { Component } from 'react';
import { Styles } from '@material-ui/styles/withStyles/withStyles';
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import {
  Grid,
  Typography,
  Icon,
  Theme
} from '@material-ui/core';
import IntersectionVisible from 'react-intersection-visible';
import { divide } from 'lodash';

class GridLayoutWidget extends Component {

  static styles = (theme) => {
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

  state = {
    data: [],
    page: 0,
    pageSize: 10,
    totalCount: 0,
    loadingData: true,
    variables: {}
  }

  constructor(props, context) {
    super(props, context);

    this.componentDefs = props.api.getComponents(['core.Loading']);
    this.getData = this.getData.bind(this);
  }

  // getData = async () => {
  async getData() {


    const self = this;
    const { props } = this;
    const { formData, uiSchema, api, formContext } = props;
    const uiOptions = uiSchema["ui:options"] || {};

    if (uiOptions.remoteData === true) {
      try {


        this.setState({ loadingData: true });
        const graphqlDefinitions = formContext.$formState.formDef.graphql;
        if (graphqlDefinitions.query || graphqlDefinitions.queries) {
          let queryDefinition = graphqlDefinitions.query;

          let variables;
          if (this.state.data.length == 0) {
            variables = api.utils.objectMapper(self, uiOptions.variables);
            this.setState({
              page: variables.paging.page,
              pageSize: variables.paging.pageSize,
              variables: { ...variables }
            });
          } else {
            variables = { ...this.state.variables, paging: { page: this.state.page, pageSize: this.state.pageSize } }
          }

          api.log('GRIDLAYOUTWIDGET - Mapped variables for query', { variables }, 'debug');

          const queryResult = await api.graphqlQuery(queryDefinition.text, variables).then();


          if (queryResult.errors && queryResult.errors.length > 0) {
            api.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
            this.setState({ data: [], page: 0, totalCount: 0, loadingData: false });
          } else {


            let result = api.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap);
            this.setState((prevState) => ({ data: prevState.data.concat(result.data), page: result.page + 1, totalCount: result.totalCount, loadingData: false }));
          }
        } else {
          this.setState({ data: [], page: 0, totalCount: 0, loadingData: false });
        }
      } catch (remoteDataError) {
        this.setState({ data: [], page: 0, totalCount: 0, loadingData: false });
      }
    } else {
      let data = [];
      if (formData && formData.length) {
        formData.forEach(row => {
          data.push({ ...row })
        });
        this.setState({ data: data, page: 0, totalCount: 0, loadingData: false });
      }
    }

  }

  componentDidMount = () => {
    this.getData();
  }

  onShow = (event) => {
    if (!this.state.loadingData) this.getData();
  }

  render() {
    const { props, state } = this;
    const { api, classes, uiSchema } = props;
    const uiOptions = uiSchema["ui:options"] || {};
    const { Loading } = this.componentDefs;

    const loadingMessage = uiOptions.loadingMessage ? uiOptions.loadingMessage : 'Loading product dimensions, please wait a moment';

    let ChildComponent = api.getComponent(uiOptions.component);
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
        {this.props.children}
        {
          state.loadingData && state.data.length > 0 &&
          <Typography classes={{ root: classes.loading }} variant={'h6'} align="center">Loading more &nbsp;<Icon className={classes.spinning} color="primary">autorenew</Icon></Typography>
        }
        {!state.loadingData && state.data.length > 0 && state.data.length < state.totalCount && <IntersectionVisible onShow={this.onShow}>
          <Typography classes={{ root: classes.loading }} variant={'h6'}>Load More</Typography>
        </IntersectionVisible>}
      </>
    );
  }
};

const GridLayoutComponent = compose(withApi, withStyles(GridLayoutWidget.styles))(GridLayoutWidget);
export default GridLayoutComponent;

