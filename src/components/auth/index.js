import React, {Component} from 'react';
import LoginCard from './LoginCard';
import RegisterCard from './RegisterCard';

export class LoginPage extends Component {

    render(){
        return <LoginCard />
    }
}

export class RegisterPage extends Component {

    render(){
        return <RegisterCard />
    }
}

export default LoginPage;