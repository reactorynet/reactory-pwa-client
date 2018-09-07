import logo from './images/aot_icon.png';
import logoWide from './images/aot_logo_wide.png';
import UserDashboard from '../../components/home/WooSparks';
import DefaultAssessmentView from '../../components/assess/DefaultView';
export default {
    muiTheme: {
        type: 'bootstrap',
        palette: {
            primary1Color: '#5da4bf',
            primary: {
                light: '#90d5f2',
                main: '#5da4bf',
                dark: '#27758f',  //#0F5d6b
                contrastText: '#000',
            },
            secondary: {
                light: '#776086',
                main: '#4b3659',
                dark: '#221030',
                contrastText: '#fff',
            },
            report: {
                empty: '#F7BFBA',
                fill: '#990033'
            }
        },
        assets: {
            login: {
                featureImage: logo,
                logo: logoWide
            }
        },
        content: {
            appTitle: 'Age of Teams',        
            login: {
                message: 'igniting digital products'
            },
            dashboardComponent: UserDashboard,
            assessmentComponent: DefaultAssessmentView,
            navigation: [
                { 
                    id: 'main_nav', 
                    entries: [    
                        { id: '1', title: 'Product Ideas', link: '/reactory/product-ideas', icon: 'announcement', roles: ['PRODUCT_MANAGER'] },
                        { id: '2', title: 'Feature Ideas', link: '/reactory/feature-ideas', icon: 'check_circle', roles: ['PRODUCT_MANAGER'] },
                        { id: '3', title: 'Validations', link: '/reactory/validations', icon: 'bug_report', roles: ['PRODUCT_MANAGER'] },
                        { id: '4', title: 'Estimations', link: '/reactory/estimations', icon: 'autorenew', roles: ['PRODUCT_MANAGER'] },
                        { id: '5', title: 'My Priorities', link: '/reactory/priorities', icon: 'change_history', roles: ['PRODUCT_MANAGER'] },
                        { id: '6', title: 'Feasibility Map', link: '/reactory/feasibility-map', icon: 'description', roles: ['PRODUCT_MANAGER'] },
                        { id: '7', title: 'Product Plan', link: '/reactory/product-plan', icon: 'donut_small', roles: ['PRODUCT_MANAGER'] },
                        { id: '8', title: 'Team Dynamics', link: '/reactory/team-dynamics', icon: 'supervisor_account', roles: ['PRODUCT_MANAGER'] },
                        { id: '8', title: 'MS Teams Setup', link: '/reactory/ms-teams-config-tab', icon: 'supervisor_account', roles: ['PRODUCT_MANAGER'] },                
                        { id: '9', title: 'My Profile', link: '/profile', icon: 'dashboard', roles: ['PRODUCT_MANAGER'] },
                        { id: '10', title: 'Administration', link: '/reactory/administration', icon: 'build', roles: ['PRODUCT_MANAGER'] },
                        { id: '11', title: 'Sparky Bot', link: '/reactory/spark-bot', icon: 'sentiment_satisfied_alt', roles: ['PRODUCT_MANAGER'] },
                    ] 
                }
            ]    
        },
        navigation: {
            sidebarLeft: false,
            sidebarLeftComponent: null             
        }
    }
};