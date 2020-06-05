import React, { Component } from 'react';
import { compose } from 'recompose';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { withStyles, makeStyles } from '@material-ui/core/styles';
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

const headerStyles = makeStyles((theme) => ({
  headerContainer: {
    display: 'flex',
    padding: theme.spacing(2),
    paddingBottom: 0
  },
  avatarContainer: {
    flex: '0 0 auto',
    marginRight: '16px'
  },
  titleContainer: {
    flex: '1 1 auto'
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(0.5)
  },
  copyIcon: {
    fontSize: '1rem',
    marginLeft: theme.spacing(1)
  },
  subtitle: {
    fontSize: '0.9rem',
    lineHeight: '1rem'
  }

}));

const CustomHeader = props => {
  const classes = headerStyles();

  return (
    <div className={classes.headerContainer}>
      <div className={classes.avatarContainer}><Avatar variant="rounded" src={props.image} /></div>
      <div className={classes.titleContainer}>
        <Typography variant="h4" classes={{ root: classes.title }} onClick={() => props.copyClick(props.title)}>
          {props.title}
          <Tooltip title="Copy to clipboard" placement="right">
            <Icon color="primary" className={classes.copyIcon}>assignment</Icon>
          </Tooltip>
        </Typography>
        <Typography variant="h6" classes={{ root: classes.subtitle }}>{props.subtitle}</Typography>
      </div>
    </div>
  )
}

class ProductCardWidget extends Component {

  static styles = (theme) => {
    const textDark = 'rgba(0,0,0,0.87)';
    return {
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

    const copyClickHandler = (labelText) => {
      var tempInput = document.createElement('input');
      tempInput.value = labelText;
      document.body.appendChild(tempInput)
      tempInput.select()
      document.execCommand('copy');
      tempInput.remove();

      api.createNotification('Copied To Clipboard!', { body: `'${labelText}' successfully copied to your clipboard.`, showInAppNotification: true, type: 'success' });
    }

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
        <CardHeader component={() => <CustomHeader title={data.code} subtitle={data.name} image={data.image} copyClick={copyClickHandler} />} />
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
