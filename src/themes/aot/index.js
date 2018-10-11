import logo from './images/aot_icon.png';
import logoWide from './images/aot_logo_wide.png';
import UserDashboard from '../../components/home/WooSparks';
import DefaultAssessmentView from '../../components/assess/DefaultView';
export default {
    muiTheme: {
        type: 'bootstrap',
        palette: {
            primary1Color: '#464775',
            primary: {
                light: '#90d5f2',
                main: '#5da4bf',
                dark: '#464775',  //#0F5d6b
                contrastText: '#FFFFFF',
            },
            secondary: {
                light: '#F3F2F1',
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
                        { id: '0', title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER'] },
                        { id: '1', title: 'Tasks', link: '/actions', icon: 'announcement', roles: ['USER'] },
                        { id: '2', title: 'Feature Ideas', link: '/reactory/feature-ideas', icon: 'check_circle', roles: ['PRODUCT_MANAGER'] },
                        { id: '3', title: 'Validations', link: '/reactory/validations', icon: 'bug_report', roles: ['PRODUCT_MANAGER'] },
                        { id: '4', title: 'Estimations', link: '/reactory/estimations', icon: 'autorenew', roles: ['PRODUCT_MANAGER'] },
                        { id: '5', title: 'My Priorities', link: '/reactory/priorities', icon: 'change_history', roles: ['PRODUCT_MANAGER'] },
                        { id: '6', title: 'Feasibility Map', link: '/reactory/feasibility-map', icon: 'description', roles: ['PRODUCT_MANAGER'] },
                        { id: '10', title: 'My Profile', link: '/profile', icon: 'user_account', roles: ['USER'] },
                        { id: '11', title: 'Administration', link: '/reactory/administration', icon: 'build', roles: ['PRODUCT_MANAGER'] },
                        { id: '12', title: 'Sparky Bot', link: '/reactory/spark-bot', icon: 'sentiment_satisfied_alt', roles: ['PRODUCT_MANAGER'] },
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