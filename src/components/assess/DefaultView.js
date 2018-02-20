import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isNil } from 'lodash';
import classNames from 'classnames';
import { withStyles, withTheme } from 'material-ui/styles';
import Paper from 'material-ui/Paper';
import Button from 'material-ui/Button';
import Grid from 'material-ui/Grid';
import Avatar from 'material-ui/Avatar';
import ArrowForward from 'material-ui-icons/ArrowForward'
import Assessment from './Assessment';
import StaffImages from '../../assets/images/staff';
import { StyleHelper } from '../../themes';

const nil = isNil;

class DefaultView extends Component {

    static styles = (theme) => {
        const primaryColor = theme.palette.primary.main;
        const primaryColorLight = theme.palette.primary.light;
        return {
            card: {
                maxWidth: '765px',
                marginLeft: 'auto',
                marginRight:'auto' ,
                ...StyleHelper.lrPadding(5)
            },
            media: {
                maxWidth: 375
            },
            statsCard: {
                minHeight: '150px',
                marginLeft: 'auto',
                marginRight: 'auto',
            },
            welcomeHeader: {
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
            statsCardAlt: {
                backgroundColor: primaryColorLight,
                minHeight: '150px'
            },
            logo: {
                maxWidth: '370px'
            },
            welcomeContainer: {                
                ...StyleHelper.height(300)
            },
            button: {
                position: 'absolute',
                bottom: theme.spacing.unit * 2,
                right: theme.spacing.unit * 2,
            },
            brandStatement: {
                color: primaryColor,
                fontWeight: 'lighter',
                fontStyle: 'italic'
            },
            delegateHeader: {
                display: 'flex',
                justifyContent: 'space-between',
                padding: 10
            },
            delegateAvatarContainer: {
                display: 'flex',
                justifyContent: 'flex-end',                
            },
            delegateHeaderTitle: {
                color: primaryColor,
                marginTop: '5px',
                marginBottom: '5px',
                marginLeft: theme.spacing.unit,
                fontSize: theme.spacing.unit * 2.5
            },
            delegateBusinessUnit: {
                color: primaryColorLight,
                marginLeft: theme.spacing.unit,
                marginTop: '5px',
                marginBottom: '5px',
                fontSize: theme.spacing.unit * 1.5,
                fontWeight: 'bold'
            },
            delegateAvatar: {
                width: 60,
                height: 60
            }
        };
    };

    welcomeScreen() {
        const { classes, assessment } = this.props;
        return (
            <div className={classes.welcomeContainer}>
                <h4 className={classes.welcomeHeader}>Welcome</h4>
                <p>Thank you for taking the time to assess {assessment.delegateTitle}. This assessment should take approximately 5 - 7 minutes.</p>
                <p>You will be asked to provide a rating against a series of behaviours that espouse the organizational leadership brand:</p>
                
                <blockquote className={classes.brandStatement}>"{assessment.survey.leadershipBrand.title}"</blockquote>
                
                <p>Click on the arrow button to get started</p>
            </div>
        )
    }

    thankYouScreen() {
        const { classes, assessment } = this.props;

        return (
            <div className={classes.welcomeContainer}>
                <h4 className={classes.welcomeHeader}>Welcome</h4>
                <p>Thank you for taking the time to assess {assessment.delegateTitle}.</p>                                                
                <Button>Dashboard</Button>
                <Button>Complete the next available assessment</Button>
            </div>
        );
    }

    ratingScreen(){
        const { classes, assessment } = this.props;
        const { step } = this.state;
        
        return (
            <div className={classes.welcomeContainer}>
                <h4 className={classes.welcomeHeader}>Welcome</h4>
                <p>Thank you for taking the time to assess {assessment.delegateTitle}.</p>                                                
                <Button>Dashboard</Button>
                <Button>Complete the next available assessment</Button>
            </div>
        );
    }

    nextStep(){
        let maxSteps = this.props.assessment.survey.leadershipBrand.qualities.count + 2;
        if(this.state.step < maxSteps)
        this.setState({step: this.state.step+1})
    }

    render() {
        const { classes, theme, assessment } = this.props;
        const { step, valid } = this.state;
        const { nextStep } = this;
        let wizardControl = null;
        let maxSteps = assessment.survey.leadershipBrand.qualities.length + 2;
        if(step === 0) wizardControl = this.welcomeScreen();
        if(step === maxSteps) wizardControl = this.thankYouScreen();
        if(nil(wizardControl) === true) wizardControl = this.ratingScreen();
        return (
            <Grid container spacing={16}>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.card}>
                        <Grid container spacing={4}>                                                       
                            <Grid item xs={12} sm={6}>
                                <Avatar src={StaffImages.TheaN} className={classNames(classes.delegateAvatar)} alt={assessment.delegateTitle}></Avatar>
                                <div>
                                    <p className={classes.delegateHeaderTitle}>{assessment.delegateTitle}</p>
                                    <p className={classes.delegateBusinessUnit}>{assessment.delegate.businessUnit.title}</p>
                                </div>
                             </Grid>
                             <Grid item xs={12} sm={6}>
                                <span>{assessment.survey.title}</span>
                            </Grid>                            
                        </Grid>
                        <Button variant="fab" aria-label="delete" color="primary" className={classes.button} onClick={nextStep}>
                            <ArrowForward />
                        </Button>                                                                        
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.card} >
                        {wizardControl}                        
                    </Paper>
                </Grid>
            </Grid>
        );
    }

    static propTypes = {
        assessment: PropTypes.instanceOf(Assessment)
    };

    static defaultProps = {
        assessment: new Assessment()
    };

    constructor(props, context){
        super(props, context);
        this.state = {
            valid: true,
            step: 0
        }
        this.welcomeScreen = this.welcomeScreen.bind(this);
        this.thankYouScreen = this.thankYouScreen.bind(this);
    }
};

const DefaultViewComponent = DefaultView;
export default withStyles(DefaultViewComponent.styles)(withTheme()(DefaultViewComponent));

