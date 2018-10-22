
export const StyleHelper = {
    debug: () => ({ outline: '1px solid red' }),
    height: (size = 0, unit = 'px') => ({ height: `${size}${unit}` }),
    lrPadding: (size = 0, unit = 'px') => ({ paddingLeft: `${size}${unit}`, paddingRight: `${size}${unit}` })
};

export const defaultTheme = {
    type: 'material',
    palette: {
        primary1Color: '#424242',
        primary: {
            light: '#6d6d6d',
            main: '#424242',
            dark: '#1b1b1b',
            contrastText: '#ffffff',
        },
        secondary: {
            light: '#ff9e40',
            main: '#ff6d00',
            dark: '#c43c00',
            contrastText: '#fff',
        },
    },
    assets: {
        featureImage: `${process.env.CDN_ROOT}/themes/reactory/images/featured.jpg`,
        logo: `${process.env.CDN_ROOT}/themes/reactory/images/logo.jpg`,
        favicon: `${process.env.CDN_ROOT}/themes/reactory/images/favicon.png`,
    },
    content: {
        appTitle: 'Reactory - Build Apps. Fast.',
        login: {
            message: 'Building Apps. Just. Like. That.',
        },
    },
}

export const getTheme = () => {
    return defaultTheme
};