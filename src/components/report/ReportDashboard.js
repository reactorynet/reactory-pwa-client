import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    BrowserRouter as Router,
    Route,    
  } from 'react-router-dom';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import moment from 'moment';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Chip from '@material-ui/core/Chip';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core/List';
import Card, { CardHeader, CardMedia, CardContent, CardActions } from '@material-ui/core/Card';
import Collapse from '@material-ui/core/Collapse';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import SaveIcon from '@material-ui/icons/Save';
import PrintIcon from '@material-ui/icons/Print';
import SupervisorIcon from '@material-ui/icons/SupervisorAccount';
import RowingIcon from '@material-ui/icons/Rowing';
import FavoriteIcon from '@material-ui/icons/Favorite';
import ShareIcon from '@material-ui/icons/Share';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ScheduleIcon from '@material-ui/icons/Schedule';
import PageviewIcon from '@material-ui/icons/Pageview';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import DateRangeIcon from '@material-ui/icons/DateRange';
import PersonIcon from '@material-ui/icons/Person';
import EmailIcon from '@material-ui/icons/Email';
import PlaylistAddCheck from '@material-ui/icons/PlaylistAddCheck';
import PhotoCamera from '@material-ui/icons/PhotoCamera';
import Avatar from '@material-ui/core/Avatar';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';

//recharts imports
import {Radar, RadarChart, PolarGrid, Legend,
    PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

let ReportCardsData = require("./mock/ReportCards.json");



const data = [
    {name: 'Page A', uv: 4000, pv: 2400, amt: 2400},
    {name: 'Page B', uv: 3000, pv: 1398, amt: 2210},
    {name: 'Page C', uv: 2000, pv: 9800, amt: 2290},
    {name: 'Page D', uv: 2780, pv: 3908, amt: 2000},
    {name: 'Page E', uv: 1890, pv: 4800, amt: 2181},
    {name: 'Page F', uv: 2390, pv: 3800, amt: 2500},
    {name: 'Page G', uv: 3490, pv: 4300, amt: 2100},
];
class ReportCard extends Component {
    constructor(props, context){
        super(props, context);
        this.state = {
            expanded: false
        };

        this.handleExpandClick = this.handleExpandClick.bind(this);
        this.handleViewDetailClick = this.handleViewDetailClick.bind(this);
    }
    static styles = theme => ({
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
          backgroundColor: theme.palette.primary.dark,
        },
        radarContainer: {
            display: 'flex',
            justifyContent: 'center'
        }
      });

    handleExpandClick(){
        this.setState({expanded: !this.state.expanded });
    }

    handleViewDetailClick(){
        this.props.history.push(`/reports/detail/${this.props.card.id}`);
    }

    render(){
        const { classes, card, theme } = this.props;
        const { expanded } = this.state;
        const cardGraphData = [];
        card.ratings.map((rating) => {
            cardGraphData.push({ quality: rating.quality.title, score: rating.quality.score  })
        });

        let radar = {
            width: 300,
            height: 300,
            outerRadius: 100,
            cx: 150,
            cy: 150
        };

        return (
        <Grid item xs={12} sm={ expanded === false ? 4 : 12 }>
            <Card className={classes.card}>
                <CardHeader
                    avatar={
                    <Avatar aria-label="Recipe" className={classes.avatar}>
                        {card.score}
                    </Avatar>
                    }                    
                    title={card.assessmentTitle}
                    subheader={moment(card.reportDate).format('DD-MM-YYYY')}
                />
                <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>          
                    <CardContent >
                        <Typography variant='p'>Your overall score for the assessment is {card.score}. This score is based on the 
                        feedback from your peers, direct reports and supervisors.<br/>  Click the view button to view the 
                        details for this assessment report.
                        </Typography>
                        <Grid container spacing={8}>
                            <Grid item sm={12} md={6} className={classes.radarContainer}>
                                <RadarChart cx={radar.cx} cy={radar.cy} outerRadius={radar.outerRadius} width={radar.width} height={radar.height} data={cardGraphData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="quality" />
                                    <PolarRadiusAxis/>
                                    <Radar name={`${card.firstName} ${card.lastName}`} dataKey="score" stroke={theme.palette.primary.dark} fill={theme.palette.primary.light} fillOpacity={0.6}/>
                                </RadarChart>
                            </Grid>
                            <Grid item sm={12} md={6}>
                                <Grid container spacing={4}>
                                {cardGraphData.map((qualityScore) => { 
                                    return (
                                        <Grid item sm={12} md={6} style={{paddingTop: '20px'}}>                                                                                    
                                            <BarChart width={240} height={60} data={data}>
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
                    <IconButton aria-label="Print">
                        <PrintIcon />
                    </IconButton>
                    <IconButton aria-label="Print">
                        <DateRangeIcon />
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

const ReportCardComponent = compose(withRouter, withTheme(), withStyles(ReportCard.styles))(ReportCard);

class ReportDashboard extends Component {


    static styles = (theme) => ({
        mainContainer: {
            width:'100%',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',                    
        }        
    });

    static propTypes = {
        user:  PropTypes.object
    };

    static defaultProps = {
        user: null 
    };
    
    render(){    
        const { classes, history } = this.props;
        

                                                
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item xs={12} sm={12}> 
                <Toolbar>
                    <Typography variant="title" color="inherit">
                        Reports
                    </Typography>
                </Toolbar>                              
                </Grid>
                {this.state.reportCards.map(reportCard => {
                    const viewDetails = () => {
                        
                    };
                    return (                
                    <ReportCardComponent card={reportCard} onViewDetails={viewDetails}/>                
                    )})}                      
            </Grid>
        );
    }

    windowResize(){
        this.forceUpdate();
    }

    constructor(props, context){
        super(props, context);
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            reportCards: [...ReportCardsData]
        }
        
        window.addEventListener('resize', this.windowResize);
    }
}

const _component = compose(
    withRouter,
    withStyles(ReportDashboard.styles),
    withTheme()
  )(ReportDashboard);
  export default _component;