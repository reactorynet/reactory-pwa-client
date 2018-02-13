import stairs from './images/stairs.jpg';
import logo from './images/logo.png';
import UserDashboard from '../../components/home/TowerStoneHomeComponent';
import DefaultAssessmentView from '../../components/assess/DefaultView';

export default {
    muiTheme: {
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
            assessmentComponent: DefaultAssessmentView            
        }
    },    
};