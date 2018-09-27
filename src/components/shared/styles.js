const styles = (theme) => ({
  root600: {
    padding: theme.spacing.unit,
    maxWidth: '600px',
    minWidth: '320px',
    textAlign: 'center',
  },
  logo: {
    display: 'block',
    height: '200px',
    margin: 0,
    padding: 0,
    background: `url(${theme.assets.login.logo || '//placehold.it/200x200'})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    marginRight: '0px',
    width: 'auto',
  }
});

export default styles;
