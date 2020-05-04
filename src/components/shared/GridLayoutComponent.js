import React, { Component } from 'react';
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { Grid } from '@material-ui/core';
import IntersectionVisible from 'react-intersection-visible';

class GridLayoutWidget extends Component {

  static styles = (theme) => {
    return {}
  }

  state = {
    data: [],
    page: 0,
    pageSize: 10,
    totalCount: 0,
    loadingData: true
  }

  constructor(props, context) {
    super(props, context);

    this.componentDefs = props.api.getComponents(['core.Loading'])
  }

  getData = async () => {
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
          let variables = api.utils.objectMapper(self, uiOptions.variables);
          api.log('GRIDLAYOUTWIDGET - Mapped variables for query', { variables }, 'debug');
          const queryResult = await api.graphqlQuery(queryDefinition.text, variables).then();

          if (queryResult.errors && queryResult.errors.length > 0) {
            api.log(`Error loading remote data for MaterialTableWidget`, { formContext, queryResult })
            this.setState({ data: [], page: 0, totalCount: 0, loadingData: false });
          } else {
            let result = api.utils.objectMapper(queryResult.data[queryDefinition.name], uiOptions.resultMap);
            this.setState({ data: result.data, page: result.page - 1, totalCount: result.totalCount, loadingData: false });
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
    console.log('______ONSHOW_____');

    // load more data

  }

  onHide = (event) => {
    console.log('______ONHIDE_____');

    // not in use

  }
  onIntersect = (event) => {
    console.log('______ONINTERSECT_____');

    //
  }

  render() {
    const { props, state } = this;
    const { api, classes, formData, formContext, uiSchema } = props;
    const uiOptions = uiSchema["ui:options"] || {};
    const { Loading } = this.componentDefs;

    const loadingMessage = uiOptions.leadingMessage ? uiOptions.leadingMessage : 'Loading Product Dimensions, please wait a moment';

    let ChildComponent = api.getComponent(uiOptions.component);
    let componentProps = {};

    return (
      <>
        <Grid container spacing={2} >
          {state.loadingData && <Loading message={loadingMessage} />}
          {
            state.data.map(itemData => {
              componentProps = { data: itemData }
              return (<Grid item xs={12} sm={6} md={3} ><ChildComponent {...componentProps} /></Grid>)
            })
          }
        </Grid>
        {!state.loadingData && state.data.length > 0 && <IntersectionVisible onIntersect={this.onIntersect} onHide={this.onHide} onShow={this.onShow}>
          <p>Loading more...</p>
        </IntersectionVisible>}
      </>
    );
  }
};

const GridLayoutComponent = compose(withApi, withStyles(GridLayoutWidget.styles))(GridLayoutWidget);
export default GridLayoutComponent;
