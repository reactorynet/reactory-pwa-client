import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from 'material-ui/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import classNames from 'classnames';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import Paper from 'material-ui/Paper';
import Avatar from 'material-ui/Avatar';
import IconButton from 'material-ui/IconButton';
import PlayIcon from 'material-ui-icons/PlayCircleFilled';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List';
import * as mocks from '../../models/mock';

class UserSurvey extends Component {
    static styles = (theme) => {
        return {
            mainContainer: {
                width:'100%',
                maxWidth: '1024px',
                marginLeft: 'auto',
                marginRight: 'auto',                    
            },
            general: {
                padding: '5px'
            },
        };
    }

    static propTypes = {
        user: PropTypes.object.isRequired,
        surveyDashboard: PropTypes.object.isRequired
    }

    static defaultProps = {
        user: mocks.loggedInUser,
        surveyDashboard: {
            title: 'Current Surveys',
            surveys: mocks.loggedInUserSurveys,            
        }
    }


    render(){
        const { classes, user, surveyDashboard, history } = this.props;
    
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                        <Typography variant='headline'>Overdue Surveys</Typography>
                        <Typography>
                            The surveys listed below already past the official cut off date for completion and should be attended to first.
                            If you are unable to perform the assessment please click the trash icon and provide a reason why the survey cannot be completed.                    
                        </Typography>
                        <List>
                        {surveyDashboard.surveys.overdue.map((survey, sid) => {

                            const launch = () => {
                                history.push(`/assess/${survey.id}`)
                            }

                            return (
                                <ListItem key={sid} dense button className={classes.listItem}>
                                    <Avatar alt={`${survey.title}`}>!</Avatar>
                                    <ListItemText primary={survey.title} secondary={survey.completed} />
                                    <ListItemSecondaryAction>                                    
                                        <IconButton onClick={launch}>
                                            <PlayIcon />
                                        </IconButton>                                                                   
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )
                        })}
                        </List>
                    </Paper>                    
                </Grid>

                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                        <Typography variant='headline'>Current Surveys</Typography>
                        <Typography>
                            The surveys listed below are surveys which are currently awaiting your feedback.  These are sorted by order of their closing date.
                        </Typography>
                        <List>
                        {surveyDashboard.surveys.overdue.map((survey, sid) => {
                            return (
                                <ListItem key={sid} dense button className={classes.listItem}>
                                    <Avatar alt={`${survey.title}`}>{survey.overall}</Avatar>
                                    <ListItemText primary={survey.title} secondary={survey.completed} />
                                    <ListItemSecondaryAction>                                    
                                        <IconButton>
                                            <PlayIcon />
                                        </IconButton>                                                                   
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )
                        })}
                        </List>
                    </Paper>                    
                </Grid>


                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                        <Typography variant='headline'>Completed Surveys</Typography>
                        <Typography>
                            The surveys below are completed and are for review only.  Survey results will only appear here once 
                            the results have been released and shared by our facilitators with you.
                        </Typography>
                        <List>
                        {surveyDashboard.surveys.overdue.map((survey, sid) => {
                            return (
                                <ListItem key={sid} dense button className={classes.listItem}>
                                    <Avatar alt={`${survey.title}`}>{survey.overall}</Avatar>
                                    <ListItemText primary={survey.title} secondary={survey.completed} />
                                    <ListItemSecondaryAction>                                    
                                        <IconButton>
                                            <PlayIcon />
                                        </IconButton>                                                                   
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )
                        })}
                        </List>
                    </Paper>                    
                </Grid>
            </Grid>
        );
    }
    
    constructor(props, context){
        super(props, context);
        console.log('UserSurvey component instantiating', { props, context} );
        this.state = {
            activeSurveyIndex: -1
        }
    }
}

const UserSurveyComponent = compose(
    withRouter,
    withStyles(UserSurvey.styles),
    withTheme()
  )(UserSurvey);
  export default UserSurveyComponent;
