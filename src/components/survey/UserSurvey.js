import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {isNil} from 'lodash';
import moment from 'moment';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import ViewIcon from '@material-ui/icons/PageviewOutlined'
import {List, ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

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
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
        surveys: PropTypes.object
    }

    static defaultProps = {        
        surveys: {
            overdue: [],
            current: [],
            complete: []
        }                    
    }


    render(){
        const { classes, surveys, history, api } = this.props;
        
        const AssessmentListItem = ( { assessment, key } ) => {
            const { survey, delegate, assessor, selfAssessment, assessmentType } = assessment                            
            const listTitle = selfAssessment === true ? 'Self assessment' : `${delegate.firstName} ${delegate.lastName}`
            const goAssessment = () => {
                history.push(`/assess/${assessment.id}`)
            }
            return (
                <ListItem key={key} dense button className={classes.listItem} onClick={goAssessment}>
                    <Avatar alt={`${survey.title}`} src={api.getAvatar(delegate)}></Avatar>
                    <ListItemText 
                        primary={`${survey.title} - ${listTitle}`} 
                        secondary={survey.completed} />
                    <ListItemSecondaryAction>                                    
                        <IconButton>
                            <ViewIcon />
                        </IconButton>                                                                   
                    </ListItemSecondaryAction>
                </ListItem>
            )
        };

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
                        {surveys.overdue.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
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
                        {surveys.overdue.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
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
                        {surveys.complete.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                        </List>
                    </Paper>                    
                </Grid>
            </Grid>
        );
    }
    
    constructor(props, context){
        super(props, context);
        this.state = {
            activeSurveyIndex: -1
        }
    }
}

const ThemedSurveyComponent = compose(
    withApi,
    withRouter,
    withStyles(UserSurvey.styles),
    withTheme()
  )(UserSurvey);

const UserSurveyComponent = ({ userId, api, onSurveySelect }) => {

return (
    <Query query={api.queries.Surveys.surveysForUser} variables={{ id: api.getUser().id }}>
        { ({ loading, error, data }) => {
            if(loading === true) return (<p>Loading survey data...</p>);
            if(isNil(error) === false) return (<p>Error during load...</p>);

            const surveys = {
                overdue: [],
                current: [],
                complete: [],
            };

            data.userSurveys.forEach((assessment) => {
                if(assessment.complete === true) surveys.complete.push(assessment)
                else {
                    const now = moment();
                    if(now.after(moment(assessment.survey.start)) === true) surveys.overdue.push(assessment);
                    else surveys.current.push(assessment);
                } 
            });

            return (<ThemedSurveyComponent surveys={surveys} />);
        }}
    </Query>);
}

export default compose(
    withApi
)(UserSurveyComponent);

  