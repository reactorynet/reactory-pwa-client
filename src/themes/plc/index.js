import stairs from './images/stairs.jpg';
import logo from './images/logo.png';
import UserDashboard from '../../components/home/TowerStoneHomeComponent';
import DefaultAssessmentView from '../../components/assess/DefaultView';

export default {
    muiTheme: {
        type: 'material',
        palette: {
            primary1Color: '#3C6598',
            primary: {
                light: '#6d92c9',
                main: '#3c6598',
                dark: '#003b6a',
                contrastText: '#fff',
              },
              secondary: {
                light: '#6d92c9',
                main: '#3c6598',
                dark: '#003b6a',
                contrastText: '#fff',
              },
              report: {
                empty: '#6d92c9',
                fill: '#3C6598'
            }         
        },
        assets: {
            login: {
                featureImage: stairs,
                logo
            }
        },
        content: {
            appTitle: 'Purposeful Leadership Company',
            login: {
                message: 'Each one of us has only one precious life'
            },
            dashboardComponent: UserDashboard,
            assessmentComponent: DefaultAssessmentView,
            navigation: [
                { 
                    id: 'main_nav', 
                    entries: [    
                        { id: '1', title: 'Inbox', link: '/inbox', icon: 'email', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '2', title: 'Surveys', link: '/surveys', icon: 'check_circle', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '2', title: 'Ideas', link: '/reactory/product-ideas', icon: 'announcement', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '3', title: 'Reports', link: '/reports', icon: 'bug_report', roles: ['PRODUCT_MANAGER', 'USER'],  },
                        { id: '4', title: 'Actions', link: '/actions', icon: 'autorenew', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '5', title: 'Profile', link: '/profile', icon: 'change_history', roles: ['PRODUCT_MANAGER', 'USER'] },
                        { id: '6', title: 'Admin', link: '/admin', icon: 'description', roles: ['PRODUCT_MANAGER'] },                        
                    ] 
                }
            ]
        }
    },    
};