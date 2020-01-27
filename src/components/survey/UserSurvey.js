import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import { isNil, sortBy, reverse } from 'lodash';
import moment from 'moment';
import {
    Avatar,
    Paper,
    Grid,
    IconButton,
    Icon,
    Typography,
    Tooltip,
} from '@material-ui/core';
import { List, ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";

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
        this.componentDefs = props.api.getComponents(['core.UserListItem', 'towerstone.OwlyListItem', 'core.Logo', 'core.ApplicationUserListItem']);
        this.totalSurveys = this.totalSurveys.bind(this)
    }

    totalSurveys() {
        const { surveys } = this.props;
        return surveys.overdue.length + surveys.current.length + surveys.complete.length;
    }

    render() {
        const { classes, surveys, history, api, minimal, showComplete, theme } = this.props;
        const { UserListItem, OwlyListItem, Logo, ApplicationUserListItem } = this.componentDefs;
        const surveyCount = this.totalSurveys();

        let SystemUserListItem = OwlyListItem;
        if(theme.key === 'plc'){

         SystemUserListItem = ( props ) => { 
                const p = {...props, firstName: 'The Purposeful Leadership', lastName: 'Company' };
                return (<ApplicationUserListItem {...p} />);
            }
        }

        const AssessmentListItem = (props) => {
            const { assessment } = props;          
            const { survey, delegate, assessor, selfAssessment, assessmentType } = assessment;
            let is180 = survey.surveyType === '180';            
            let listTitle = selfAssessment === true ? 'Self assessment' : `${delegate.firstName} ${delegate.lastName}`

            if(is180 === true) {
                listTitle = `Assessing Team ${survey.delegateTeamName}`
            }

            const goAssessment = () => {
                history.push(`/assess/${assessment.id}`)
            }
            return (
                <ListItem key={assessment.id} dense button className={classes.listItem} onClick={goAssessment}>
                    <Avatar alt={`${survey.title}`} src={api.getAvatar(delegate)} style={{marginRight: '8px'}}></Avatar>
                    <ListItemText
                        primary={`${survey.title} - ${listTitle}`}
                        secondary={`Valid from ${moment(survey.startDate).format('DD MMMM YYYY')} till ${moment(survey.endDate).format('DD MMMM YYYY')}`} />
                    <ListItemSecondaryAction>
                        <IconButton onClick={goAssessment}>
                            <Tooltip title={assessment.complete === false ? 'Click here to complete this assessment' : 'Click here to view your input into this assessment'}>
                                <Icon>
                                    {assessment.complete === false ?'play_circle_filled' : 'search'}
                                </Icon>
                            </Tooltip>
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            )
        };

        return (
            <Grid container spacing={16} className={classes.mainContainer} style={{marginTop: `${theme.spacing(1)}`}}>
                {minimal === false ?  <Grid item sm={12} xs={12} md={12} offset={4}><Logo /></Grid> : null }                
                
                <Grid item sm={12} xs={12} md={12} offset={4}>
                    <Typography variant='caption' color='primary'>Overdue Surveys</Typography>
                    <Paper className={classes.general}>
                        {
                            surveys.overdue.length > 0 && surveyCount > 0 ?
                            <Fragment>                                                                
                                <List>
                                    <SystemUserListItem message={"The surveys listed below are already past the official cut-off date for completion and should be attended to first."} />
                                    {surveys.overdue.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                </List>
                            </Fragment> : <SystemUserListItem message={"There are no overdue assessments here"} />
                        }
                    </Paper>
                </Grid>

                <Grid item sm={12} xs={12} md={12}  offset={4}>
                    <Typography variant='caption' color='primary'>Current Surveys</Typography>
                    <Paper className={classes.general}>                        
                        {surveys.current.length > 0 && surveyCount > 0 ?
                            <Fragment>
                                <List>
                                    <SystemUserListItem message={"The surveys listed below are surveys which are currently awaiting your feedback.  These are sorted by order of their closing date."} />
                                    {surveys.current.map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                </List>
                            </Fragment> : <SystemUserListItem message={"There are no assessments here"} />}
                    </Paper>
                </Grid>

                <Grid item sm={12} xs={12} md={12} offset={4}>
                <Typography variant='caption' color='primary'>Completed Surveys</Typography>
                    <Paper className={classes.general}>                    
                        {
                            surveys.complete.length > 0 && surveyCount > 0 ?
                                <Fragment>                                                                        
                                    <List>
                                        <SystemUserListItem message={"The surveys below are completed and are for review only. Survey results will only appear here once the results have been released and shared with you by one of our facilitators."} />
                                        {reverse(sortBy(surveys.complete, [(assessment)=>{ return moment(assessment.survey.startDate || '2010-01-01').valueOf() }])).map((assessment, sid) => <AssessmentListItem assessment={assessment} key={sid} />)}
                                    </List>
                                </Fragment> : <SystemUserListItem message={"You don't have any assessment results available yet"} />
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
    withTheme
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
                    ;
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

