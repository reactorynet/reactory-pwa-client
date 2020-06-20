import React, {Component} from 'react';
import LoginCard from './LoginCard';
import RegisterCard from './RegisterCard';

export class LoginPage extends Component {

    render(){
        return <LoginCard {...this.props} />
    }
}

export class RegisterPage extends Component {

    render(){
        return <RegisterCard {...this.props} />
    }
}

export default LoginPage;