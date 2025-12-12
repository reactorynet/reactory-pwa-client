const {
  REACT_APP_CLIENT_KEY = 'reactory',
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT = 'http://localhost:4000',
} = process.env;

const PREFIX = 'ReactoryHOC';

const classes = {
  root_paper: `${PREFIX}-root_paper`,
  selectedMenuLabel: `${PREFIX}-selectedMenuLabel`,
  prepend: `${PREFIX}-prepend`,
  selected: `${PREFIX}-selected`,
  preffered: `${PREFIX}-preffered`,
  get_started: `${PREFIX}-get_started`,
  schema_selector: `${PREFIX}-schema_selector`
};

const packageInfo = {
  version: '1.0.0'
}

export {
  REACT_APP_CLIENT_KEY,
  REACT_APP_CLIENT_PASSWORD,
  REACT_APP_API_ENDPOINT,
  classes,
  packageInfo
};