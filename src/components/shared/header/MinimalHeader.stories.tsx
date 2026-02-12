import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MinimalHeader from './MinimalHeader';

const meta: Meta<typeof MinimalHeader> = {
  title: 'Reactory/Shared/Header/MinimalHeader',
  component: MinimalHeader,
  argTypes: {
    reactory: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof MinimalHeader>;

export const Default: Story = {
  args: {
    // @ts-ignore
    reactory: {
        $user: {
            applicationName: 'Storybook App',
            loggedIn: { roles: ['ANON'] },
            menus: [],
        },
        i18n: { t: (s: string) => s },
        hasRole: () => true,
        on: () => {},
        removeListener: () => {},
    }
  }
};

