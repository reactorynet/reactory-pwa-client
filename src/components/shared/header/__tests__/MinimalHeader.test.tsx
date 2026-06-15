import React from 'react';
import { render, screen } from '@testing-library/react';
import MinimalHeader from '../MinimalHeader';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ReactoryProvider } from '@reactory/client-core/api/ApiProvider';

const mockReactory = {
    $user: {
        applicationName: 'Test App',
        loggedIn: {
            roles: ['USER'],
            firstName: 'Test',
            lastName: 'User'
        },
        menus: []
    },
    hasRole: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    removeListener: jest.fn(),
    i18n: {
        t: (key: string) => key
    },
    getComponents: jest.fn().mockReturnValue({}),
    getUser: jest.fn().mockReturnValue({ when: new Date() }),
};

const theme = createTheme();

describe('MinimalHeader', () => {
    it('renders the application title', () => {
        // @ts-ignore
        render(
            <ReactoryProvider reactory={mockReactory as any}>
                <ThemeProvider theme={theme}>
                    <MinimalHeader />
                </ThemeProvider>
            </ReactoryProvider>
        );
        expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('does not render drawer button', () => {
        // @ts-ignore
        render(
            <ReactoryProvider reactory={mockReactory as any}>
                <ThemeProvider theme={theme}>
                    <MinimalHeader />
                </ThemeProvider>
            </ReactoryProvider>
        );
        expect(screen.queryByLabelText('Menu')).not.toBeInTheDocument();
    });
});
