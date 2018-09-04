import phoenix from './images/phoenix.png';
import logo from './images/logo.png';
import ThreeDeeMockup from './images/3Dmockup.jpg'
import UserDashboard from '../../components/home/WooSparks';
import DefaultAssessmentView from '../../components/assess/DefaultView';
export default {
    muiTheme: {
        type: 'bootstrap',
        palette: {
            primary1Color: '#488A99',
            primary: {
                light: '#79BACA',
                main: '#488A99',
                dark: '#4D585C',  //#0F5d6b
                contrastText: '#fff',
            },
            secondary: {
                light: '#ffe087',
                main: '#dbae58',
                dark: '#a77f2a',
                contrastText: '#fff',
            },
            report: {
                empty: '#F7BFBA',
                fill: '#990033'
            }
        },
        assets: {
            login: {
                featureImage: ThreeDeeMockup,
                logo
            }
        },
        content: {
            appTitle: 'WooSparks',        
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
                        { id: '9', title: 'My Profile', link: '/reactory/dashboard', icon: 'dashboard', roles: ['PRODUCT_MANAGER'] },
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