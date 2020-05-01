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

class ProductDimensionsWidget extends Component {

  static styles = (theme) => {
    const textDark = 'rgba(0,0,0,0.87)';
    return {
      headerTitle: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: textDark
      },
      headerSubTitle: {
        fontSize: '0.8rem',
        color: textDark
      },
      divider: {
        marginTop: '10px',
        marginBottom: '10px'
      },
      contentContainer: {
        paddingLeft: theme.spacing(1.5)
      }
    }
  }

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { props } = this;
    const { classes, data } = props;

    let sysProIconColor = '';
    switch (data.onSyspro) {
      case 'on_syspro':
        sysProIconColor = '#9AD86E';
        break;
      case 'not_on_syspro':
        sysProIconColor = '#D22D2C';
        break;
      case 'on_hold':
        sysProIconColor = '#D22D2C';
        break;
      case 'on_partial_hold':
        sysProIconColor = '#f7b425';
        break;
      case 'on_partial_hold':
        sysProIconColor = '#f7b425';
        break;
    }

    return (
      <Card>
        <CardHeader
          classes={{ title: classes.headerTitle, subheader: classes.headerSubTitle }}
          avatar={<Avatar variant="rounded" src={data.image} className={classes.avatar}></Avatar>}
          title={data.code}
          subheader={data.name}
        />
        <CardContent>
          <Grid container direction="row" alignItems="center" >
            <Grid item xs={10}>
              <CutomTooltip title="Add To Quote" aria-label="add to quote" placement="right" open>
                <Fab size="medium" color="primary" className={classes.fab}>
                  <Icon>add</Icon>
                </Fab>
              </CutomTooltip>
            </Grid>
            {
              data.onSyspro != '' && sysProIconColor != '' && <Grid item xs={2}>
                <Icon style={{color: sysProIconColor}}>info</Icon>
              </Grid>
            }
          </Grid>

          <Divider classes={{ root: classes.divider }} />

          <div className={classes.contentContainer}>
            <Typography variant="body2"><strong>Packed Length</strong>: {data.packedLength} cm</Typography>
            <Typography variant="body2"><strong>Packed Width</strong>: {data.packedWidth} cm</Typography>
            <Typography variant="body2"><strong>Packed Height</strong>: {data.packedHeight} cm</Typography>
            <Typography variant="body2"><strong>Packed Volume</strong>: {data.packedVolume} m3</Typography>
            <Typography variant="body2"><strong>Packed Weight</strong>: {data.packedWeight} kg</Typography>
          </div>
        </CardContent>
      </Card>
    );
  }
};

const ProductDimensionsComponent = compose(withApi, withStyles(ProductDimensionsWidget.styles))(ProductDimensionsWidget);
export default ProductDimensionsComponent;
