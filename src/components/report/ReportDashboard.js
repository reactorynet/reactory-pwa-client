import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    BrowserRouter as Router,
    Route, 
    Switch,   
  } from 'react-router-dom';
import { withRouter } from 'react-router';

import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import { isNil, find, isArray } from 'lodash';
import moment from 'moment';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {
    Card, CardHeader, CardMedia, CardContent, CardActions,
    Icon,
    List,  ListItem, ListItemSecondaryAction, ListItemText
 } from '@material-ui/core/';
import Collapse from '@material-ui/core/Collapse';
import BackIcon from '@material-ui/icons/KeyboardArrowLeft';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ScheduleIcon from '@material-ui/icons/Schedule';
import PageviewIcon from '@material-ui/icons/Pageview';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

//recharts imports
import {Radar, RadarChart, PolarGrid, Legend,
    PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import createTypography from '@material-ui/core/styles/createTypography';

let ReportCardsData = require("./mock/ReportCards.json");

class ReportCard extends Component {
    constructor(props, context){
        super(props, context);
        this.state = {
            expanded: false
        };

        this.handleExpandClick = this.handleExpandClick.bind(this);
        this.handleViewDetailClick = this.handleViewDetailClick.bind(this);
    }

    static styles = (theme) => ({
        card: {
          
        },
        media: {
          height: 194,
        },
        actions: {
          display: 'flex',
        },
        expand: {
          transform: 'rotate(0deg)',
          transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
          }),
          marginLeft: 'auto',
        },
        expandOpen: {
          transform: 'rotate(180deg)',
        },
        avatar: {
          color: theme.palette.primary.contrastText,
          backgroundColor: theme.palette.primary.dark,        
        },
        radarContainer: {
            display: 'flex',
            justifyContent: 'center'
        }
      });

    static propTypes = {}

    handleExpandClick(){
        this.setState({expanded: !this.state.expanded });
    }

    handleViewDetailClick(){
        this.props.history.push(`/reports/detail/${this.props.card.survey.id}`);
    }

    render(){
        const { classes, card, theme } = this.props;
        const { expanded } = this.state;
        const cardGraphData = [];
        const qualityIndex = {

        };

        card.assessments.map((assessment) => {
            if(assessment.ratings && assessment.ratings.length > 0) {
                assessment.ratings.map((rating) => { 
                    if(qualityIndex[rating.quality.id]) {
                        cardGraphData[qualityIndex[rating.quality.id]].score += rating.rating;
                        cardGraphData[qualityIndex[rating.quality.id]].count += 1;
                        cardGraphData[qualityIndex[rating.quality.id]].avg += cardGraphData[qualityIndex[rating.quality.id]].score / cardGraphData[qualityIndex[rating.quality.id]].count;
                    } else {
                        qualityIndex[rating.quality.id] = cardGraphData.length;
                        cardGraphData.push({ 
                            quality: rating.quality.title,
                            score: rating.rating,
                            avg: rating.rating / 1,
                            count: 1
                        });                        
                    }
                });            
            }            
        });

        let radar = {
            width: 300,
            height: 300,
            outerRadius: 100,
            cx: 150,
            cy: 150
        };

        return (
        <Grid item xs={12} sm={ expanded === false ? 4 : 12 } key={this.props.key}>
            <Card className={classes.card}>
                <CardHeader
                    avatar={
                    <Avatar aria-label="Recipe" className={classes.avatar}>
                        {card.overall}
                    </Avatar>
                    }                    
                    title={card.survey.title}
                    subheader={moment(card.survey.startDate).format('DD-MM-YYYY')}
                />
                <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>          
                    <CardContent >
                        <Typography variant='paragraph'>Your overall score for the assessment is {card.overall}. This score is based on the 
                        feedback from your peers, direct reports and supervisors.<br/>  Click the view button to view the 
                        details for this assessment report.
                        </Typography>
                        <Grid container spacing={8}>
                            <Grid item sm={12} md={6} className={classes.radarContainer}>
                                <RadarChart cx={radar.cx} cy={radar.cy} outerRadius={radar.outerRadius} width={radar.width} height={radar.height} data={cardGraphData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="quality" />
                                    <PolarRadiusAxis/>
                                    <Radar name={`${card.firstName} ${card.lastName}`} dataKey="avg" stroke={theme.palette.primary.dark} fill={theme.palette.primary.light} fillOpacity={0.6}/>
                                </RadarChart>
                            </Grid>
                            <Grid item sm={12} md={6}>
                                <Grid container spacing={8}>
                                {cardGraphData.map((qualityScore) => { 
                                    return (
                                        <Grid item sm={12} md={6} style={{paddingTop: '20px'}}>                                                                                    
                                            <BarChart width={240} height={60} data={[]}>
                                                <Bar dataKey='uv' fill={theme.palette.primary.light}/>
                                            </BarChart>
                                            <Typography variant="caption" style={{textAlign: 'center'}}>{qualityScore.quality}</Typography>                                        
                                        </Grid>);
                                })}                                    
                                </Grid>
                            </Grid>                            
                        </Grid>
                    </CardContent>
                </Collapse>
                <CardActions className={classes.actions} disableActionSpacing>
                    <IconButton aria-label="View Report Details" onClick={this.handleViewDetailClick}>
                        <PageviewIcon />
                    </IconButton>                                        
                    <IconButton
                    className={classNames(classes.expand, {
                        [classes.expandOpen]: this.state.expanded,
                    })}
                    onClick={this.handleExpandClick}
                    aria-expanded={this.state.expanded}
                    aria-label="Show more"
                    >
                    <ExpandMoreIcon />
                    </IconButton>
                </CardActions>          
            </Card>
      </Grid>
        );
    }
}

const ReportCardComponent = compose(withRouter, withTheme, withStyles(ReportCard.styles))(ReportCard);

const collectRatingsForQuality = (report, quality) => {
    const ratings = []
    if(isArray(report.assessments) === true){
        report.assessments.map((a) =>  {
        if(isArray(a.ratings) === true){
            a.ratings.map((r) => {
                if(r.quality.id === quality.id) {
                    ratings.push({ 
                        ...r,
                        qOrdinal: r.quality.ordinal,
                        bOrdinal: r.behaviour.ordinal
                    });
                } 
            });
        }
        });
    }    
    return ratings;
};

class BarChartForQuality extends Component  {

    constructor(props, context){
        super(props, context)
        this.state = {

        }
    }

    static styles = theme => ({

    })

    static propTypes = {
        report: PropTypes.object,
        quality: PropTypes.object
    }


    
    render() {
        const { report, quality, theme } = this.props;        
        const ratings = collectRatingsForQuality(report, quality);

        return (
            <BarChart width={400} height={180} data={ratings}>
                <XAxis dataKey="bOrdinal" />
                <YAxis />
                <Bar dataKey='rating' fill={theme.palette.primary.dark}/>
            </BarChart>
        )
    }
}

const ThemedBarChartForQuality = compose(withTheme, withStyles(BarChartForQuality.styles))(BarChartForQuality)

class ReportDetail extends Component {
    constructor(props, context){
        super(props,context);
        this.state = {

        };
        this.componentDefs = props.api.getComponents(['core.Loading', 'core.Logo'])
    }

    static styles = (theme) => {
        return {
            mainContainer: {
                width:'100%',
                maxWidth: '1024px',
                marginLeft: 'auto',
                marginRight: 'auto',
            },
            paragraph: {
                marginLeft: '15px',
                marginRight: '15px',
                textAlign: 'justify'
            },
            brandStatement: {
                marginLeft: '40px',
                marginRigt: '40px',
                textAlign: 'center'
            },
            paper: {
                ...theme.mixins.gutters(),
                paddingTop: theme.spacing(2),
                paddingBottom: theme.spacing(2),
            },
            reportHeader: {
                paddingTop: '120px',
                paddingBottom: '120px',
                textAlign: 'center',
            },
            reportAvatar: {
                width: '120px',
                height: '120px',
            },                        
        };
    }

    static propTypes = {
        report: PropTypes.object,
        theme: PropTypes.object,
        api: PropTypes.instanceOf(ReactoryApi)
    }


    render(){
        const { classes, history, report, theme, api } = this.props;
        const { survey, user, assessments } = report;
        const { Logo, Loading } = this.componentDefs;
        let reportTitle = 'Default Report Title';
        switch(survey.surveyType) {
            case '360': {
                reportTitle = '360° Leadership Assessment';        
                break;
            }
            case '180': {
                reportTitle = '180° Team Leadership Assessment';
                break;
            }
            case 'plc': {
                reportTitle = 'Assessment Report';
                break;
            }
            default: {
                reportTitle = 'Assessment Report';
                break;
            }
        }

        let radar = {
            width: 300,
            height: 300,
            outerRadius: 100,
            cx: 150,
            cy: 150
        };

        const graphData = [];
        const qualityIndex = {

        };

        assessments.map((assessment) => {
            if(assessment.ratings && assessment.ratings.length > 0) {
                assessment.ratings.map((rating) => { 
                    if(qualityIndex[rating.quality.id]) {
                        graphData[qualityIndex[rating.quality.id]].score += rating.rating;
                        graphData[qualityIndex[rating.quality.id]].count += 1;
                        graphData[qualityIndex[rating.quality.id]].avg += graphData[qualityIndex[rating.quality.id]].score / graphData[qualityIndex[rating.quality.id]].count;
                    } else {
                        qualityIndex[rating.quality.id] = graphData.length;
                        graphData.push({ 
                            quality: rating.quality.title,
                            score: rating.rating,
                            avg: rating.rating / 1,
                            count: 1
                        });                        
                    }
                });            
            }            
        });

        
        return (        
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item xs={12} sm={12}>            
                    <Toolbar>                        
                        <IconButton onClick={()=>{history.goBack()}}> 
                            <BackIcon/>
                        </IconButton>
                        <IconButton>
                            <Icon>print</Icon>
                        </IconButton>                        
                    </Toolbar>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classNames(classes.paper, classes.reportHeader)}>
                        <Avatar src={api.getAvatar(report.user)} className={classes.reportAvatar} />                        
                        <Typography variant="h3" gutterBottom style={{fontWeight:'bold'}}>{reportTitle}</Typography>
                        <Typography variant="h3" gutterBottom>{user.firstName} {user.lastName}</Typography>
                        <Typography variant="h3" gutterBottom>{survey.organization.name}</Typography>
                        <Typography variant="h3" gutterBottom>{moment(survey.endDate).format('DD MMMM YYYY')}</Typography>
                        <Logo style={{marginTop: '200px'}}/>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>1. Introduction</Typography>
                        <Typography className={classes.paragraph}>{report.user.firstName}, this report compares the results of your self-assessment, with those of the colleagues who assessed you. These assessors include the person you report to and randomly selected colleagues from the list you submitted.</Typography>
                        <Typography className={classes.paragraph}>You have been assessed against the TowerStone values and supporting leadership behaviours for all TowerStone employees.</Typography>
                        <br/>
                        <br/>
                        <Typography variant="subtitle1" color="primary"  className={classes.brandStatement}>{report.survey.leadershipBrand.description}</Typography>
                        <br/>
                        <br/>
                        <Typography  className={classes.paragraph}>The values form the foundation of your desired culture at {report.survey.organization.name} and in order to build this culture, you as leaders
                        must intentionally live out the values by displaying the supporting behaviours. In this way, you will align your people to
                        the purpose and strategy of {report.survey.organization.name}.</Typography>
                        <br/>
                        <br/>
                        <Typography variant="subtitle1" color="primary" className={classes.brandStatement}>"You cannot manage what you cannot measure"</Typography>
                        <br/>
                        <br/>
                        <Typography className={classes.paragraph}>The TowerStone Leadership Assessment is a tool that provides insight to track your behavioural growth as you seek
                        to align yourself with the TowerStone values. It is now your responsibility to use this feedback to improve your ability
                        to (a) model these behaviours and (b) coach the next levels of leadership to align to the TowerStone values. Please
                        consider the feedback carefully before completing the Personal Development Plan that follows the assessment.</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>2. Rating Scale</Typography>
                        <Typography className={classes.paragraph}>The feedback you have received is in the context of the following rating scale:</Typography>
                        {report.survey.leadershipBrand.scale.entries.map((entry) => (<Typography className={classes.paragraph}>{entry.rating} - {entry.description}</Typography>))}
                    </Paper>
                </Grid>                    

                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>3. Qualities</Typography>                        
                        <Typography className={classes.paragraph}>The ratings for your different leadership behaviours have been combined to achieve an average rating for each Leadership Quality.</Typography>

                        <Typography variant="h4" color="primary" gutterBottom>3.1 Individual Ratings</Typography>
                        <Typography className={classes.paragraph}>The chart below indicates the ratings submitted by the individual assessors.</Typography>
                        <RadarChart 
                            cx={radar.cx} 
                            cy={radar.cy} 
                            outerRadius={radar.outerRadius} 
                            width={radar.width} 
                            height={radar.height} 
                            data={graphData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="quality" />
                            <PolarRadiusAxis/>
                            <Radar name={`${user.firstName} ${user.lastName}`} dataKey="avg" stroke={this.props.theme.palette.primary.dark} fill={theme.palette.primary.light} fillOpacity={0.6}/>
                        </RadarChart>

                        <Typography variant="h4" color="primary" gutterBottom>3.2 Aggregate Ratings</Typography>
                        <Typography className={classes.paragraph}>The chart below indicates the combined ratings for all assessors.</Typography>

                    </Paper>
                </Grid>

                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>4. Behaviours</Typography>
                        <Typography variant="body" className={classes.paragraph}>The charts in this section indicate the ratings given by your assessors for each behaviour.</Typography>
                        {report.survey.leadershipBrand.qualities.map((quality, qi) => {
                            return (
                                <div>
                                    <Typography variant="h4" color="primary" gutterBottom>4.{qi + 1} {quality.title}</Typography>
                                    {quality.behaviours.map((behaviour, bi) => { 
                                        return (<Typography variant="body1">B{bi + 1} -> {behaviour.description}</Typography>)                                        
                                    })}
                                    <ThemedBarChartForQuality quality={quality} report={report} />
                                </div>
                            )
                        })}
                        <Typography variant="h4" color="primary" gutterBottom>Start behaviours</Typography>
                        <Typography variant="body">You received low ratings for the behaviours below - this means the assessors don't see you demonstrating these behaviours at all - time to get started on these!</Typography>
                        
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>5. Overall</Typography>
                        
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>6. Development Plan</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="h4" color="primary" gutterBottom>7. Acceptance and Commitment</Typography>
                        <Typography>
                            I accept and commit to addressing the feedback presented in this assessment, by taking the actions listed within the agreed timeframes.
                        </Typography>                        
                    </Paper>
                </Grid>
            </Grid>        
        )
    }
}


const ReportDetailComponent = compose(withApi, withTheme, withStyles(ReportDetail.styles))(ReportDetail)

class ReportDashboard extends Component {

    constructor(props, context){
        super(props, context);
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            reportCards: [...ReportCardsData]
        }
        
        window.addEventListener('resize', this.windowResize);
        this.dashboard = this.dashboard.bind(this);
        this.detail = this.detail.bind(this);
        this.componentDefs = props.api.getComponents(['core.Loading'])
    }
        
    static propTypes = {
        user:  PropTypes.object,
        reports: PropTypes.object,
        api: PropTypes.instanceOf(ReactoryApi)
    };

    static defaultProps = {
        user: null,
        reports: {
            available: [],
            busy: [],
            review: []
        }
    };
    
    dashboard(){
        const { classes, history, reports } = this.props;
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item xs={12} sm={12}>                
                    <Toolbar>
                        <Typography variant="h6" color="inherit">Reports</Typography>
                    </Toolbar>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.reportGroup}>
                        <Typography>Available Report</Typography>
                        {reports.available.length === 0 ? (<Typography>No available reports</Typography>) : null}
                        {reports.available.map((report, idx) => {
                            const viewDetails = () => {};
                            return (<ReportCardComponent key={idx} card={report} onViewDetails={viewDetails}/>)
                        })}
                    </Paper>                
                </Grid> 
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.reportGroup}>
                        <Typography>Pending Report</Typography>
                        {reports.review.length === 0 ? (<Typography>No pending reports</Typography>) : null}
                        {reports.review.map((report, idx) => {
                            const viewDetails = () => {};
                            return (<ReportCardComponent key={idx} card={report} onViewDetails={viewDetails}/>)
                        })}
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <Paper className={classes.reportGroup}>
                        <Typography >Assessments Open</Typography>
                        {reports.busy.length === 0 ? (<Typography>No open assessments</Typography>) : null}
                        {reports.busy.map((report, idx) => {
                            const viewDetails = () => {};
                            return (<ReportCardComponent key={idx} card={report} onViewDetails={viewDetails}/>)
                        })}
                    </Paper>
                </Grid>
            </Grid>
        );
    }


    detail(surveyId){
        const { classes, history, api } = this.props;        
        const { Loading } = this.componentDefs;
        return (
            <Query query={api.queries.Surveys.reportDetailForUser} variables={{ userId: api.getUser().id, surveyId }}>
            { ({ loading, error, data }) => {
                if(loading === true) return (<Loading message="Loading Report Details, please wait a moment" />);
                if(isNil(error) === false) return (<p>Error during load...</p>);
                const report = data.reportDetailForUser;
                return (<ReportDetailComponent report={report}/>);
            }}
            </Query>
        );
    }


    render(){
        const that = this                
        return (
            <Switch>
                <Route exact path="/reports">
                    {this.dashboard()}
                </Route>
                <Route path="/reports/detail/:surveyId" render={(props) => {
                    return that.detail(props.match.params.surveyId)
                }}>                    
                </Route>                    
            </Switch> 
        )
    }

    windowResize(){
        this.forceUpdate();
    }    
}

ReportDashboard.styles = (theme) => {
    return {
        mainContainer: {
            width:'100%',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        reportGroup: {
            padding: theme.spacing(1)
        }
    };
};


export const ThemeReportDashboard = compose(
    withApi,
    withRouter,
    withStyles(ReportDashboard.styles),
    withTheme
  )(ReportDashboard);

const UserReportComponentWithQuery = ({organizationId, api, onUserSelect}) => {  
    return (
        <Query query={api.queries.Surveys.reportsForUser} variables={{ id: api.getUser().id }}>
            { ({ loading, error, data }) => {
                if(loading === true) return (<p>Loading survey data...</p>);
                if(isNil(error) === false) return (<p>Error during load...</p>);

                const reports = {
                    available: [],
                    busy: [],
                    review: [],
                };

                const now = moment();
                data.userReports.forEach((report) => {
                    if(report.status === 'READY') reports.available.push(report)
                    else {                        
                        if(now.isAfter(moment(report.survey.startDate)) === true) reports.busy.push(report);
                        else reports.review.push(report);
                    }
                });

                return (<ThemeReportDashboard reports={reports} />);
            }}
        </Query>);
}

const  ReportDashboardComponent = compose(
    withApi
)(UserReportComponentWithQuery);

export default ReportDashboardComponent;