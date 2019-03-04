import Avatar from '@material-ui/core/Avatar';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import {
    List,
    ListSubheader,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Typography
} from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
//import muiThemeable from '@material-ui/core/styles/muiThemeable';
import { withStyles, withTheme } from '@material-ui/core/styles';
import AnnouncementIcon from '@material-ui/icons/Announcement';
import AssessmentIcon from '@material-ui/icons/Assessment';
import ActivityIcon from '@material-ui/icons/LocalActivity';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { LineChart, PieChart } from 'react-easy-chart';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

const styles = (theme) => {
    const primaryColor = theme.palette.primary.main;
    const primaryColorLight = theme.palette.primary.dark;
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
            maxWidth: '370px'
        },
        container: {
            padding: theme.spacing.unit,
        }
    };
};

const mockNotifications = [

];

const mockAssessments = [

];

const mockActions = [

];

const companyMockScores = [
];

const personalMockScores = [
];

const peersMockScores = [
];

const mockOverallData = [
    companyMockScores,
    personalMockScores,
    peersMockScores
];

class ChartData {

    constructor({ personalQuarter = 0, companyQuarter = 0, personalAnnual = 0, companyAnnual = 0 }) {
        this.personalQuarter = null;
        this.companyQuarter = null;
        this.personalAnnual = null;
        this.companyAnnual = null;
        this.showCharts = false


    }

}

class TowerStoneHomeComponent extends Component {
    static propTypes = {
        history: PropTypes.object,
        chartData: PropTypes.instanceOf(ChartData),
        api: PropTypes.instanceOf(ReactoryApi)
    };

    static defaultProps = {
        chartData: new ChartData({})
    }

    constructor(props, context) {
        super(props, context);
        const initialWidth = window.innerWidth > 0 ? window.innerWidth * 0.95 : 500;
        this.state = {
            value: 1,
            lineChart: {
                width: initialWidth,
                displayPersonalAvg: true,
                displayCompanyAvg: true,
                displayPeerAvg: true
            }
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
        this.toggleDisplayBusinessUnitAvg = this.toggleDisplayBusinessUnitAvg.bind(this);
        this.toggleDisplayCompanyAvg = this.toggleDisplayCompanyAvg.bind(this);
        this.toggleDisplayPersonalAvg = this.toggleDisplayCompanyAvg.bind(this);
        this.startAssessment = this.startAssessment.bind(this);
        this.onTaskSelect = this.onTaskSelect.bind(this);

        this.componentDefs = props.api.getComponents([
            'core.Logo',
            'towerstone.Surveys',
            'core.UserListItem',
            'core.UserTaskListWithData',
            'core.UserTaskDetailWithData',
            'towerstone.OwlyListItem'
        ]);
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

    toggleDisplayBusinessUnitAvg() {
        this.setState({ lineChart: { ...this.state.lineChart, displayPeerAvg: !this.state.lineChart.displayPeerAvg } });
    }

    toggleDisplayPersonalAvg() {
        this.setState({ lineChart: { ...this.state.lineChart, displayPersonalAvg: !this.state.lineChart.displayPersonalAvg } });
    }

    toggleDisplayCompanyAvg() {
        this.setState({ lineChart: { ...this.state.lineChart, displayCompanyAvg: !this.state.lineChart.displayCompanyAvg } });
    }

    startAssessment() {
        const { history } = this.props;
        history.push('/assess');
    }

    onTaskSelect(task) {
        const { history } = this.props;
        history.push(`/tasks/${task.id}?vm=modal`)
    }

    render() {
        const self = this;
        const { classes, theme } = this.props;
        const { 
            Logo,
            Surveys,
            UserTaskListWithData,
            OwlyListItem, 
        } = this.componentDefs;
    
        const filteredMockData = () => {
            let data = [];
            if (self.state.lineChart.displayCompanyAvg) data.push(companyMockScores);
            if (self.state.lineChart.displayPersonalAvg) data.push(personalMockScores);
            if (self.state.lineChart.displayPeerAvg) data.push(peersMockScores);

            return data;
        };
        return (
            <div style={{ maxWidth: 900, margin: 'auto' }}>
                <Grid container spacing={24}>
                    <Grid item xs={12} sm={12} style={{ textAlign: 'center' }}>
                        <Logo />
                    </Grid>
                    {this.props.chartData.showCharts ? <Grid item xs={6} sm={3}>
                        <Paper className={classes.container}>
                            <h4 className={classes.statsCardLabel}>Personal - Quarter</h4>
                            <PieChart
                                id={'personal-quarter'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={[]}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>N/A</span>
                        </Paper>
                    </Grid> : null}
                    {this.props.chartData.showCharts ? <Grid item xs={6} sm={3}>
                        <Paper className={classes.container}>
                            <h4 className={classes.statsCardLabel}>Company - Quarter</h4>
                            <PieChart
                                id={'company-quarter'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={[]}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>N/A</span>
                        </Paper>
                    </Grid> : null}
                    {this.props.chartData.showCharts ? <Grid item xs={6} sm={3}>
                        <Paper className={classes.container}>
                            <h4 className={classes.statsCardLabel}>Personal - Annual</h4>
                            <PieChart
                                id={'personal-annual'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={[]}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>N/A</span>
                        </Paper>
                    </Grid> : null}

                    {this.props.chartData.showCharts ? <Grid item xs={6} sm={3}>
                        <Paper className={classes.container}>
                            <h4 className={classes.statsCardLabel}>Company - Annual</h4>
                            <PieChart
                                id={'company-annual'}
                                styles={{ display: 'flex', justifyContent: 'center' }}
                                data={[]}
                                size={120}
                                innerHoleSize={100}
                            />
                            <span className={classes.statsScoreLabel}>N/A</span>
                        </Paper>
                    </Grid> : null}

                    {this.props.chartData.showCharts ? <Grid item xs={12} sm={12}>
                        <h4 className={classes.statsCardLabel}>Overall</h4>
                        <Paper className={classes.container}>
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
                                data={filteredMockData()}
                            />
                            <List>
                                <ListItem key={0} dense button className={classes.listItem}>
                                    <ListItemText primary={'Personal Avg'} />
                                    <ListItemSecondaryAction>
                                        <Checkbox checked={self.state.lineChart.displayPersonalAvg} onChange={self.toggleDisplayPersonalAvg} />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <ListItem key={0} dense button className={classes.listItem}>
                                    <ListItemText primary={'Business Unit Avg'} />
                                    <ListItemSecondaryAction>
                                        <Checkbox checked={self.state.lineChart.displayPeerAvg} onChange={self.toggleDisplayBusinessUnitAvg} />
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <ListItem key={0} dense button className={classes.listItem}>
                                    <ListItemText primary={'Company Avg'} />
                                    <ListItemSecondaryAction>
                                        <Checkbox checked={self.state.lineChart.displayCompanyAvg} onChange={self.toggleDisplayCompanyAvg} />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>
                        </Paper>
                    </Grid> : null}

                    <Grid item xs={12} sm={12}>
                        <Surveys minimal={true} showComplete={true} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant={"caption"} color="primary" align="center">Notifications</Typography>
                        <Paper className={classes.container}>                            
                            <List>
                                <OwlyListItem message="You have no unread notifications" />
                            </List>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant={"caption"} color="primary" align="center">Tasks</Typography>
                        <Paper className={classes.container}>
                            <List>
                                <ListSubheader>New</ListSubheader>
                                <UserTaskListWithData status="new" onTaskSelect={this.onTaskSelect} />
                                <ListSubheader>Planned Tasks</ListSubheader>
                                <UserTaskListWithData status="planned" onTaskSelect={this.onTaskSelect} />
                                <ListSubheader>In Progress</ListSubheader>
                                <UserTaskListWithData status="in-progress" onTaskSelect={this.onTaskSelect} />
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            </div>
        );
    }
}



const HomeComponent = compose(
    withRouter,
    withApi,
    withTheme(),
    withStyles(styles),    
)(TowerStoneHomeComponent);
export default HomeComponent;