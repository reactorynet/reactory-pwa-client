
export const anonUser = {
    id: '',
    firstName: '',
    lastName: '',
    avatar: '',
    anon: true,
    roles: ['ANON']
  };

export const storageKeys = {
    LoggedInUser: 'loggedInUser',
    AuthToken: 'auth_token',
    LastLoggedInEmail: '$reactory$last_logged_in_user',
    viewContext: '$rectory$viewContext',
};
  
export const ReactoryLoggedInUser = () => {
    const userString = localStorage.getItem(storageKeys.LoggedInUser);
    if (userString) {
      try {
        let parsedUser = JSON.parse(userString);        
        return parsedUser;
      } catch (parseError) {        
        return anonUser;
      }
    }
    return anonUser;
}