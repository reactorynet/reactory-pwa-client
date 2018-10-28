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
    margin: 'auto',
    padding: 0,
    background: `url(${theme.assets.logo || '//placehold.it/200x200'})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    width: 'auto',
  }
});

export default styles;
