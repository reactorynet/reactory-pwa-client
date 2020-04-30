import React, { Component } from 'react';
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import {
  Grid,
  Avatar,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Divider,
  Icon,
  Fab,
  Tooltip
} from '@material-ui/core';

const CutomTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    fontSize: theme.spacing(1.8)
  },
}))(Tooltip);

class GridLayoutWidget extends Component {

  static styles = (theme) => {
    return {
      tooltip: {
        backgroundColor: 'transparent'
      }
    }
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

      // TODO IMPLEMENT THIS

      if (formData && formData.length) {
        formData.forEach(row => {
          data.push({ ...row })
        })
      }
    }

  }

  componentDidMount = () => {
    this.getData();
  }

  render() {
    const { props, state } = this;
    const { api, classes } = props;

    api.log('GRID COMPONENT: RENDER');

    return (
      <Grid container spacing={2} >
        <h1>{state.loadingData ? '   LOADING......' : ''}</h1>
        {
          state.data.map(item => <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardHeader
                avatar={
                  <Avatar src={item.image} className={classes.avatar}></Avatar>
                }
                title={item.code}
                subheader={item.name} />
              <CardContent>

                <Grid container>
                  <Grid item xs={10}>
                    <CutomTooltip title="Add To Quote" aria-label="add to quote" placement="right" open>
                      <Fab size="medium" color="primary" className={classes.fab}>
                        <Icon>add</Icon>
                      </Fab>
                    </CutomTooltip>
                  </Grid>
                  <Grid item xs={2}>
                    <Icon>info</Icon>
                  </Grid>
                </Grid>

                <Divider />
                <Typography variant="body2"><strong>Packed Length</strong>: {item.packedLength} cm</Typography>
                <Typography variant="body2"><strong>Packed Width</strong>: {item.packedWidth} cm</Typography>
                <Typography variant="body2"><strong>Packed Height</strong>: {item.packedHeight} cm</Typography>
                <Typography variant="body2"><strong>Packed Volume</strong>: {item.packedVolume} m3</Typography>
                <Typography variant="body2"><strong>Packed Weight</strong>: {item.packedWeight} kg</Typography>
              </CardContent>
            </Card>
          </Grid>)
        }
      </Grid>
    );
  }
};

const GridLayoutComponent = compose(withApi, withStyles(GridLayoutWidget.styles))(GridLayoutWidget);
export default GridLayoutComponent;
