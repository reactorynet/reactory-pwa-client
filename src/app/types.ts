export interface NewNotification {
  id: string,
  title: string,
  type: string
}

export interface AppState {
  user: any,
  drawerOpen: boolean,
  auth_valid: boolean,
  auth_validated: boolean,
  theme: any,
  routes: any[],
  validationError: any,
  offline: boolean,
  currentRoute: any
}



export interface ReactoryHOCProps {
  [key: string]: any,
}

export interface ReactoryRouterProps {
  reactory: Reactory.Client.ReactorySDK,
  auth_validated: boolean,
  user: Reactory.Models.IUser,
  authenticating: boolean,
  header: React.ReactElement
  footer: React.ReactElement
}