import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileBottomHeader from '../MobileBottomHeader';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom'; // Need router context for navigation

const mockReactory = {
    $user: {
        applicationName: 'Test App',
        loggedIn: {
            roles: ['USER'],
            firstName: 'Test',
            lastName: 'User'
        },
        menus: [
            {
                target: 'bottom-nav',
                entries: [
                    { id: '1', title: 'Home', icon: 'home', link: '/' },
                    { id: '2', title: 'Profile', icon: 'person', link: '/profile' }
                ]
            }
        ]
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

describe('MobileBottomHeader', () => {
    it('renders the application title in top bar', () => {
        // @ts-ignore
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <MobileBottomHeader reactory={mockReactory} />
                </ThemeProvider>
            </MemoryRouter>
        );
        expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('renders bottom navigation items', () => {
        // @ts-ignore
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <MobileBottomHeader reactory={mockReactory} />
                </ThemeProvider>
            </MemoryRouter>
        );
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
    });
});
