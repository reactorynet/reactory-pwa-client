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
            }
        },
        content: {
            appTitle: 'TowerStone Leadership Centre',
            login: {
                message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.'
            },            
            dashboardComponent: UserDashboard,
            assessmentComponent: DefaultAssessmentView,
            navigation: [
                { 
                    id: 'main_nav', 
                    entries: [    
                        { id: '1', title: 'Inbox', link: '/inbox', icon: 'email', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '2', title: 'Surveys', link: '/surveys', icon: 'check_circle', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '3', title: 'Reports', link: '/reports', icon: 'bug_report', roles: ['PRODUCT_MANAGER', 'USER'],  },
                        { id: '4', title: 'Actions', link: '/actions', icon: 'autorenew', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '5', title: 'Profile', link: '/profile', icon: 'change_history', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '6', title: 'Admin', link: '/admin', icon: 'description', roles: ['PRODUCT_MANAGER'] },                        
                    ] 
                }
            ]
        }
    }
};