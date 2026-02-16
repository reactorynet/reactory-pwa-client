import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MobileBottomHeader from './MobileBottomHeader';
import { MemoryRouter } from 'react-router';

const meta: Meta<typeof MobileBottomHeader> = {
  title: 'Reactory/Shared/Header/MobileBottomHeader',
  component: MobileBottomHeader,
  decorators: [
      (Story) => (
          <MemoryRouter initialEntries={['/']}>
              <Story />
          </MemoryRouter>
      )
  ],
  argTypes: {
    reactory: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof MobileBottomHeader>;

export const Default: Story = {
  args: {
    // @ts-ignore
    reactory: {
        $user: {
            applicationName: 'Mobile App',
            loggedIn: { roles: ['USER'] },
            menus: [
                {
                    target: 'bottom-nav',
                    entries: [
                        { id: '1', title: 'Home', icon: 'home', link: '/' },
                        { id: '2', title: 'Search', icon: 'search', link: '/search' },
                        { id: '3', title: 'Profile', icon: 'person', link: '/profile' }
                    ]
                }
            ]
        },
        i18n: { t: (s: string) => s },
        hasRole: () => true,
        on: () => {},
        removeListener: () => {},
    }
  }
};

