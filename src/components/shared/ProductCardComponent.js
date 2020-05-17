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
  Tooltip,
} from '@material-ui/core';

const CutomTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    fontSize: theme.spacing(1.8)
  },
}))(Tooltip);

class ProductCardWidget extends Component {

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
      },
      fieldLabel: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(1)
      },
      fieldLabelIcon: {
        marginRight: theme.spacing(1)
      },
    }
  }

  constructor(props, context) {
    super(props, context);

    this.componentDefs = props.api.getComponents(['core.PricingLineChartComponent']);
  }

  render() {

    const { props } = this;
    const { classes, data, cardContent, currency, symbol, api, region, } = props;
    const { PricingLineChartComponent } = this.componentDefs;
    const formData = { ...data };

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
                <Icon style={{ color: sysProIconColor }}>info</Icon>
              </Grid>
            }
          </Grid>
          <Divider classes={{ root: classes.divider }} />
          {
            cardContent && cardContent.fields &&
            <div className={classes.contentContainer}>
              {
                cardContent.fields.map(field => {

                  return (
                    <Typography variant="body2" classes={{ root: classes.fieldLabel }}>
                      {
                        field.icon && field.icon != '' && <Icon classes={{ root: classes.fieldLabelIcon }}>{field.icon}</Icon>
                      }
                      <strong>{field.label}</strong>&nbsp;{
                        field.isCents ?
                          new Intl.NumberFormat((field.region || region), { style: 'currency', currency: (field.currency || currency) }).format(field.isCents ? (data[field.value] / 100) : data[field.value]) :
                          data[field.value]
                      } {field.unit}
                    </Typography>
                  )
                })
              }
            </div>
          }
          {
            cardContent && cardContent.hasPricingChart && <>
              <div style={{ height: '1rem' }}></div>
              <PricingLineChartComponent formData={formData} />
            </>
          }

        </CardContent>
      </Card>
    );
  }
};

ProductCardWidget.propTypes = {
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

ProductCardWidget.defaultProps = {
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};

const ProductCardComponent = compose(withApi, withStyles(ProductCardWidget.styles))(ProductCardWidget);
export default ProductCardComponent;
