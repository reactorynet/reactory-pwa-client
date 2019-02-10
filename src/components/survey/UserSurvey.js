import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import { isNil } from 'lodash';
import moment from 'moment';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayCircleFilled';
import ViewIcon from '@material-ui/icons/PageviewOutlined'
import { List, ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

const owly = { firstName: 'Owly', lastName: '', id: 'towerstone_owly', avatar: 'owl.jpg' };

class UserSurvey extends Component {
    static styles = (theme) => {
        return {
            mainContainer: {
                width: '100%',
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
        surveys: PropTypes.object,
        minimal: PropTypes.bool,
        showComplete: PropTypes.bool
    }

    static defaultProps = {
        surveys: {
            overdue: [],
            current: [],
            complete: []
        },
        showComplete: false,
        minimal: true
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            activeSurveyIndex: -1
        }
        this.componentDefs = props.api.getComponents(['core.UserListItem', 'towerstone.OwlyListItem']);
        this.totalSurveys = this.totalSurveys.bind(this)
    }

    totalSurveys() {
        const { surveys } = this.props;
        return surveys.overdue.length + surveys.current.length + surveys.complete.length;
    }

    render() {
        const { classes, surveys, history, api, minimal, showComplete, theme } = this.props;
        const { UserListItem, OwlyListItem } = this.componentDefs;
        const surveyCount = this.totalSurveys();

        const AssessmentListItem = ({ assessment, key }) => {          
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
            <Grid container spacing={16} className={classes.mainContainer} style={{marginTop: `${theme.spacing.unit * 4}`}}>                
                <Grid item sm={12} xs={12} md={6} offset={4}>
                    <Typography variant='caption' color='primary'>Overdue Surveys</Typography>
                    <Paper className={classes.general}>
                        {surveys.overdue.length > 0 && surveyCount > 0 ?
                            <Fragment>                                
                                {minimal === true ? <Typography>
                                    The surveys listed below already past the official cut off date for completion and should be attended to first.
                                    If you are unable to perform the assessment please click the trash icon and provide a reason why the survey cannot be completed.
                            </Typography> : null}
                                <List>
                                    {surveys.overdue.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                </List>
                            </Fragment> : <OwlyListItem message={"There are no overdue assessments here"} />}
                    </Paper>
                </Grid>

                <Grid item sm={12} xs={12} md={6}  offset={4}>
                    <Typography variant='caption' color='primary'>Current Surveys</Typography>
                    <Paper className={classes.general}>                        
                        {surveys.current.length > 0 && surveyCount > 0 ?
                            <Fragment>
                                <List>
                                    <OwlyListItem message={"The surveys listed below are surveys which are currently awaiting your feedback.  These are sorted by order of their closing date."} />
                                    {surveys.current.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                </List>
                            </Fragment> : <OwlyListItem message={"There are no assessments here"} />}
                    </Paper>
                </Grid>

                <Grid item sm={12} xs={12} md={12} offset={4}>
                <Typography variant='caption' color='primary'>Completed Surveys</Typography>
                    <Paper className={classes.general}>                    
                        {
                            surveys.complete.length > 0 && surveyCount > 0 ?
                                <Fragment>                                    
                                    <Typography>
                                        The surveys below are completed and are for review only.  Survey results will only appear here once
                                        the results have been released and shared by our facilitators with you.
                                    </Typography>
                                    <List>
                                        {surveys.complete.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                    </List>
                                </Fragment> : <OwlyListItem message={"You don't have any assessment results available yet"} />
                        }                        
                    </Paper>
                </Grid>
            </Grid>
        );
    }


}

const ThemedSurveyComponent = compose(
    withApi,
    withRouter,
    withStyles(UserSurvey.styles),
    withTheme()
)(UserSurvey);

const UserSurveyComponent = ({ userId, api, onSurveySelect, minimal = true, showComplete = true }) => {

    return (
        <Query query={api.queries.Surveys.surveysForUser} variables={{ id: api.getUser().id }}>
            {({ loading, error, data }) => {
                if (loading === true) return (<p>Loading survey data...</p>);
                if (isNil(error) === false) return (<p>Error during load...</p>);

                const surveys = {
                    overdue: [],
                    current: [],
                    complete: [],
                };

                data.userSurveys.forEach((assessment) => {
                    //debugger;
                    if(assessment) {
                        if (assessment.complete === true && showComplete === true) surveys.complete.push(assessment)
                        else {
                            if(assessment.overdue && assessment.overdue === true) surveys.overdue.push(assessment);                                                    
                            else surveys.current.push(assessment);
                        }
                    }
                    
                });

                return (<ThemedSurveyComponent surveys={surveys} minimal={minimal} showComplete={showComplete} />);
            }}
        </Query>);
}

export default compose(
    withApi
)(UserSurveyComponent);

