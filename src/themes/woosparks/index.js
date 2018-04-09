import phoenix from './images/phoenix.png';
import logo from './images/logo.png';
import UserDashboard from '../../components/home/WooSparks';
import DefaultAssessmentView from '../../components/assess/DefaultView';
export default {
    muiTheme: {
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
                featureImage: phoenix,
                logo
            }
        },
        content: {
            appTitle: 'WooSparks',
            login: {
                message: 'igniting digital products'
            },
            dashboardComponent: UserDashboard,
            assessmentComponent: DefaultAssessmentView    
        }
    }
};