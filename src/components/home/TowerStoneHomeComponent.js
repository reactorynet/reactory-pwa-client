import React, { Component } from 'react';
import moment from 'moment';
import Paper from 'material-ui/Paper';
import Button from 'material-ui/Button';
//import muiThemeable from 'material-ui/styles/muiThemeable';
import { withStyles, withTheme } from 'material-ui/styles';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List';
import AccountCircle from 'material-ui-icons/AccountCircle';
import Avatar from 'material-ui/Avatar';
import Checkbox from 'material-ui/Checkbox';
import RestoreIcon from 'material-ui-icons/Restore';
import FavoriteIcon from 'material-ui-icons/Favorite';
import LocationOnIcon from 'material-ui-icons/LocationOn';
import VerifiedUser from 'material-ui-icons/VerifiedUser';
import HelpOutline from 'material-ui-icons/HelpOutline';
import AnnounceMentIcon from 'material-ui-icons/Announcement';
import { PieChart, LineChart } from 'react-easy-chart';
import Card, { CardActions, CardContent, CardMedia } from 'material-ui/Card';
import PieChartsLeft from '../../assets/images/dashboard/donut-charts.png';
import PieChartsOverall from '../../assets/images/dashboard/donut-charts-overall.png';
import Notifications from '../../assets/images/dashboard/notifications.png';
import ActionsImage from '../../assets/images/dashboard/actions.png';
import StaffImages from '../../assets/images/staff';


const styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.light;
    return {
        card: {
            maxWidth: 365,
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
            maxWidth:'400px'
        }
    };
};

const mockNotifications = [
    { text: 'Thea Nel has nominated you as a peer. Click here to respond.', who: 'Thea Nel', avatar: StaffImages.TheaN },
    { text: 'A peer has completed feedback on "Q1 Staff Feedback".', who: '', avatar: StaffImages.Anon },
    { text: 'Mandy Eagar has declined a peer nomination, click here to nominate more.', who: 'Mandy Eagar', avatar: StaffImages.MandyE },
    { text: 'Sue Bakker has scheduled an online review session, click here to respond.', who: 'Sue Bakker', avatar: StaffImages.SueB },
    { text: 'Your leadership report for "Q4 Staff Feedback 2017" is availble for review.', who: 'Sue Bakker', avatar: StaffImages.LynneK }
];

const mockAssessments = [
    { text: 'Please complete your self assessment for the "Q1 Staff Feedback" survey.', who: 'Werner Weber', avatar: StaffImages.WernerW },
    { text: 'Please provide feedback for Thea Nel on the "Annual Managers Feedback" survey, before 27 Feb 2018.', who: 'Thea Nel', avatar: StaffImages.TheaN },
    { text: 'Please provide feedback for Mandy Eagar on the "Quarterly Executive Feedback" survey, before 28 Mar 2018.', who: 'Mandy Eagar', avatar: StaffImages.MandyE },
    { text: 'Please provide feedback for Mandy Eagar on the "Annual Managers Feedback" survey, before 27 Mar 2018.', who: 'Mandy Eagar', avatar: StaffImages.MandyE }
];

const mockActions = [
    { text: 'Complete at least 2 online training courses from the company curriculum', complete: false, due: moment('2018/04/01') },
    { text: 'Provide feedback to at least 3 of your peers and leaders using the assessment platform', complete: false, due: moment('2018/04/01') },
];

const mockOverallData = [
    [
        { x: '1-Jan-17', y: 70 },
        { x: '1-May-17', y: 73 },
        { x: '1-Sep-17', y: 68 },
        { x: '1-Jan-18', y: 71 },
    ], [
        { x: '1-Jan-17', y: 68 },
        { x: '1-May-17', y: 70 },
        { x: '1-Sep-17', y: 73 },
        { x: '1-Jan-18', y: 76 },
    ],
    [
        { x: '1-Jan-17', y: 72 },
        { x: '1-May-17', y: 71 },
        { x: '1-Sep-17', y: 74 },
        { x: '1-Jan-18', y: 73 },
    ]
];

class TowerStoneHomeComponent extends Component {

    constructor(props, context) {
        super(props, context);
        const initialWidth = window.innerWidth > 0 ? window.innerWidth * 0.95 : 500;
        this.state = {
            value: 1,
            lineChart: {
                width: initialWidth
            }
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
    }

    handleWindowResize() {
        const chartWidth = window.innerWidth > 0 ? window.innerWidth * 0.95 : 500;
        this.setState({ lineChart: { width: chartWidth } });
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleWindowResize)
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowResize);
    }

    handleChange(valueChange) {
        this.setState({ value: valueChange * 1 })
    }

    render() {
        const self = this;
        const { classes, theme } = this.props;
        const lastRating = [
            { key: '-', value: 68, color: theme.palette.report.fill },
            { key: '-', value: 32, color: theme.palette.report.empty },
        ];
        const notifications = mockNotifications;
        let notificationItems = [];
        notifications.map((notification, idx) => notificationItems.push((
            <ListItem key={idx} dense button className={classes.listItem}>
                <Avatar alt="Remy Sharp" src={notification.avatar} />
                <ListItemText primary={notification.text} />
                <ListItemSecondaryAction>
                    <Checkbox />
                </ListItemSecondaryAction>
            </ListItem>
        )));

        let assessmentItems = [];
        mockAssessments.map((assessment, idx) => assessmentItems.push((
            <ListItem key={idx} dense button className={classes.listItem}>
                <Avatar alt="Remy Sharp" src={assessment.avatar} />
                <ListItemText primary={assessment.text} />
            </ListItem>
        )));

        let actionItems = [];
        mockActions.map((action, index) => actionItems.push((
            <ListItem key={index} dense button className={classes.listItem}>
                <ListItemText primary={action.text} secondary={`Due: ${action.due.format('DD-MM-YYYY')}`} />
            </ListItem>
        )));
        return (
            <div style={{ marginRight: '5px', marginLeft: '5px' }}>
                <div>
                    <Grid container spacing={24}>
                        <Grid item xs={12} sm={12} style={{textAlign:'center'}}>
                            <img src={theme.assets.login.logo} className={classes.logo} alt={theme}/>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <h4 className={classes.statsCardLabel}>Personal - Quarter</h4>
                            <PieChart
                                id={'personal-quarter'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={lastRating}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>68%</span>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <h4 className={classes.statsCardLabel}>Company - Quarter</h4>
                            <PieChart
                                id={'company-quarter'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={lastRating}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>72%</span>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <h4 className={classes.statsCardLabel}>Personal - Annual</h4>
                            <PieChart
                                id={'personal-annual'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={lastRating}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>70%</span>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                            <h4 className={classes.statsCardLabel}>Company - Annual</h4>
                            <PieChart
                                id={'company-annual'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={lastRating}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>74%</span>
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <h4 className={classes.statsCardLabel}>Overall</h4>
                            <Paper>
                                <LineChart
                                    xType={'time'}
                                    axes={true}
                                    dataPoints
                                    yDomainRange={[60, 80]}
                                    xTicks={4}
                                    interpolate={'cardinal'}
                                    width={Math.floor(self.state.lineChart.width)}
                                    tickTimeDisplayFormat={'%m %Y'}
                                    height={self.state.lineChart.width > 780 ? Math.floor(self.state.lineChart.width / 4) : 250}
                                    data={mockOverallData}
                                />
                                <List>
                                    <ListItem key={0} dense button className={classes.listItem}>                                        
                                        <ListItemText primary={'Personal Avg'} />
                                        <ListItemSecondaryAction>
                                            <Checkbox />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <ListItem key={0} dense button className={classes.listItem}>                                        
                                        <ListItemText primary={'Business Unit Avg'} />
                                        <ListItemSecondaryAction>
                                            <Checkbox />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <ListItem key={0} dense button className={classes.listItem}>                                        
                                        <ListItemText primary={'Company Avg'} />
                                        <ListItemSecondaryAction>
                                            <Checkbox />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </List>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={12}>
                            <Paper>
                                <h4 className={classes.statsCardLabel}><AnnounceMentIcon /> Available Assessments</h4>
                                <List>
                                    {assessmentItems}
                                </List>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Paper>
                                <h4 className={classes.statsCardLabel}><AnnounceMentIcon /> Notifications</h4>
                                <List>
                                    {notificationItems}
                                </List>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Paper>
                                <h4 className={classes.statsCardLabel}><AnnounceMentIcon /> Actions</h4>
                                <List>
                                    {actionItems}
                                </List>
                            </Paper>
                        </Grid>

                    </Grid>
                </div>
            </div>
        );
    }
}

export default withStyles(styles)(withTheme()(TowerStoneHomeComponent));