import pebbles from './images/pebbles.jpg';
import logo from './images/logo.png';
import UserDashboard from '../../components/home/TowerStoneHomeComponent';
import DefaultAssessmentView from '../../components/assess/DefaultView';
export default {
    muiTheme: {
        type: 'material',
        palette: {
            primary1Color: '#990033',
            primary: {
                light: '#cf445c',
                main: '#990033',
                dark: '#64000d',
                contrastText: '#fff',
            },
            secondary: {
                light: '#e04d43',
                main: '#a8111b',
                dark: '#720000',
                contrastText: '#fff',
            },
            report: {
                empty: '#F7BFBA',
                fill: '#990033'
            }
        },
        assets: {
            login: {
                featureImage: pebbles,
                logo
            },
            mainCss: `${process.env.CDN_ROOT}/themes/reactory/css/styles.css`
        },
        content: {
            appTitle: 'TowerStone Leadership Centre',
            login: {
                message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.'
            },            
            dashboardComponent: UserDashboard,
            assessmentComponent: DefaultAssessmentView,
            
        }
    }
};