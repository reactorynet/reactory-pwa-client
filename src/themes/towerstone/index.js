import pebbles from './images/pebbles.jpg';
import logo from './images/logo.jpg';
import UserDashboard from '../../components/home/TowerStoneHomeComponent';
export default {
    muiTheme: {
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
                empty: '#e04d43',
                fill: '#990033'
            }
        },
        assets: {
            login: {
                featureImage: pebbles,
                logo
            }
        },
        content: {
            appTitle: 'TowerStone Leadership Centre',
            login: {
                message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.'
            },
            dashboardComponent: UserDashboard
        }
    }
};