import Reactory from "@reactory/reactory-core";

/**
 * The default user when no user is logged is returned 
 * as the anon user.
 */
export const anonUser: Reactory.Models.IApiStatus = {
  id: '',
  firstName: '',
  lastName: '',
  avatar: '',
  anon: true,
  roles: ['ANON'],
  menus: [],
  loggedIn: null,
  status: 'API OK',
  when: new Date(),
  navigationComponents: [],

};

export const storageKeys = {
  LoggedInUser: 'loggedInUser',
  AuthToken: 'auth_token',
  LastLoggedInEmail: '$reactory$last_logged_in_user',
  viewContext: '$rectory$viewContext',
  developmentMode: '$reactory.developmentMode'
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