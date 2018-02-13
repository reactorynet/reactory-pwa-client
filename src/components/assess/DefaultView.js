import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles, withTheme } from 'material-ui/styles';
import Paper from 'material-ui/Paper';
import Grid from 'material-ui/Grid';
import Avatar from 'material-ui/Avatar';
import StaffImages from '../../assets/images/staff';

class DefaultView extends Component {
    
    static styles = (theme) => {
        const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;
    return {
        card: {
            maxWidth: '90%',
            marginLeft: 'auto',
            marginRight: 'auto'
        },
        media: {
            maxWidth: 375
        },
        statsCard: {
            minHeight: '150px',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        statsCardLabel: {
            padding: 0,
            margin: 0,
            textAlign: 'center',
            paddingTop: '5px',
            color: primaryColor
        },
        statsScoreLabel: {
            position: 'relative',
            bottom: '70px',
            width: '100%',
            textAlign: 'center',
            display: 'block',
            color: primaryColor,
            fontWeight: 'bold'
        },
        assessmentStatsLabel: {

        },
        pieChart: {
            '.pie-chart': {
                marginLeft: 'auto',
                marginRight: 'auto'
            }
        },
        statsCardAlt: {
            backgroundColor: primaryColorLight,
            minHeight: '150px'
        },
        logo: {
            maxWidth:'370px'
        }
    };
    };

    render(){
        const { classes, theme } = this.props;
        return (
            <Grid container spacing={24}>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.card}>
                    <h3>Thea Nel</h3>
                    <h4>Annual Managers Feedback</h4>
                    <Avatar src={StaffImages.TheaN}></Avatar>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.card} >                        
                        <p>Questions go here</p>
                    </Paper>
                </Grid>
            </Grid>
        );
    }
};

const DefaultViewComponent = DefaultView;
export default withStyles(DefaultViewComponent.styles)(withTheme()(DefaultViewComponent));

