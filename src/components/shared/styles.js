export const coreStyles = (theme) => ({
  root600: {
    padding: theme.spacing.unit,
    maxWidth: '600px',
    minWidth: '320px',
    textAlign: 'center',
  },
  root900: {
    padding: theme.spacing.unit,
    maxWidth: '900px',
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
  },
  '@keyframes spin': {
    '0%': {
      transform: 'rotate(0deg)',
    }, 
    '100%': {
      transform: 'rotate(360deg)'
    }
  }
})

export const styles = (theme, custom = {}) => ({
  ...coreStyles(theme),...custom
});

export default styles;
