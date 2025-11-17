import type { Meta, StoryObj } from '@storybook/react';
import { Typography, Box } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const meta = {
  title: 'Design System/Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Typography components demonstrating Roboto font loading.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'caption'],
      description: 'Typography variant',
    },
    children: {
      control: 'text',
      description: 'Text content',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={true}>
        <Box sx={{ padding: '20px', maxWidth: '600px' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h1">Heading 1 - Roboto Light (300)</Typography>
      <Typography variant="h2">Heading 2 - Roboto Light (300)</Typography>
      <Typography variant="h3">Heading 3 - Roboto Regular (400)</Typography>
      <Typography variant="h4">Heading 4 - Roboto Regular (400)</Typography>
      <Typography variant="h5">Heading 5 - Roboto Regular (400)</Typography>
      <Typography variant="h6">Heading 6 - Roboto Medium (500)</Typography>
      <Typography variant="body1">Body 1 - Roboto Regular (400) - This is the main body text.</Typography>
      <Typography variant="body2">Body 2 - Roboto Regular (400) - This is smaller body text.</Typography>
      <Typography variant="caption">Caption - Roboto Regular (400) - This is caption text.</Typography>
    </Box>
  ),
};

export const FontWeights: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontWeight: 300 }}>Light (300) - Roboto Light</Typography>
      <Typography sx={{ fontWeight: 400 }}>Regular (400) - Roboto Regular</Typography>
      <Typography sx={{ fontWeight: 500 }}>Medium (500) - Roboto Medium</Typography>
      <Typography sx={{ fontWeight: 700 }}>Bold (700) - Roboto Bold</Typography>
    </Box>
  ),
};

export const SampleText: Story = {
  args: {
    variant: 'body1',
    children: 'The quick brown fox jumps over the lazy dog. This text should be displayed in Roboto font.',
  },
}; 