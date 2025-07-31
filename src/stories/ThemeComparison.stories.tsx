import type { Meta, StoryObj } from '@storybook/react';
import { 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Icon,
  Paper,
  Divider
} from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const meta = {
  title: 'Design System/ThemeComparison',
  component: Typography,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Compare light and dark themes with various components.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={true}>
        <Box sx={{ padding: '20px', maxWidth: '1200px' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComponentComparison: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4" gutterBottom>
        Theme Comparison - Light vs Dark
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Use the theme selector above to switch between Default Theme (Light) and Reactory Theme (Dark)
      </Typography>

      {/* Typography Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Typography Examples</Typography>
          <Typography variant="h1">Heading 1</Typography>
          <Typography variant="h2">Heading 2</Typography>
          <Typography variant="h3">Heading 3</Typography>
          <Typography variant="body1">This is body text with primary color.</Typography>
          <Typography variant="body2" color="text.secondary">
            This is secondary body text.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            This is disabled caption text.
          </Typography>
        </CardContent>
      </Card>

      {/* Button Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Button Examples</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary">Primary</Button>
            <Button variant="contained" color="secondary">Secondary</Button>
            <Button variant="outlined" color="primary">Outlined</Button>
            <Button variant="text" color="primary">Text</Button>
            <Button variant="contained" disabled>Disabled</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Input Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Input Examples</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              label="Primary Input" 
              variant="outlined" 
              placeholder="Enter text here"
              fullWidth
            />
            <TextField 
              label="Secondary Input" 
              variant="filled" 
              placeholder="Filled variant"
              fullWidth
            />
            <TextField 
              label="Standard Input" 
              variant="standard" 
              placeholder="Standard variant"
              fullWidth
            />
          </Box>
        </CardContent>
      </Card>

      {/* Icon Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Icon Examples</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Icon color="primary">home</Icon>
            <Icon color="secondary">favorite</Icon>
            <Icon color="error">error</Icon>
            <Icon color="warning">warning</Icon>
            <Icon color="info">info</Icon>
            <Icon color="success">check_circle</Icon>
            <Icon>settings</Icon>
            <Icon>person</Icon>
            <Icon>email</Icon>
            <Icon>phone</Icon>
          </Box>
        </CardContent>
      </Card>

      {/* Paper Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Paper & Surface Examples</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="subtitle1">Paper Surface</Typography>
              <Typography variant="body2" color="text.secondary">
                This is content on a paper surface
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 200 }} elevation={3}>
              <Typography variant="subtitle1">Elevated Paper</Typography>
              <Typography variant="body2" color="text.secondary">
                This paper has elevation
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 200 }} elevation={8}>
              <Typography variant="subtitle1">High Elevation</Typography>
              <Typography variant="body2" color="text.secondary">
                This paper has high elevation
              </Typography>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* Divider Example */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Divider Examples</Typography>
          <Typography variant="body1">Content above divider</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1">Content below divider</Typography>
        </CardContent>
      </Card>
    </Box>
  ),
};

export const ColorPalette: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" gutterBottom>
        Color Palette Comparison
      </Typography>
      
      {/* Primary Colors */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Primary Colors</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'primary.light', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                Light
              </Typography>
            </Box>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'primary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                Main
              </Typography>
            </Box>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'primary.dark', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                Dark
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Secondary Colors */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Secondary Colors</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'secondary.light', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'secondary.contrastText' }}>
                Light
              </Typography>
            </Box>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'secondary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'secondary.contrastText' }}>
                Main
              </Typography>
            </Box>
            <Box sx={{ 
              width: 100, 
              height: 60, 
              bgcolor: 'secondary.dark', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1
            }}>
              <Typography variant="caption" sx={{ color: 'secondary.contrastText' }}>
                Dark
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Background Colors */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Background Colors</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ 
              width: 150, 
              height: 60, 
              bgcolor: 'background.default', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}>
              <Typography variant="caption">
                Background Default
              </Typography>
            </Box>
            <Box sx={{ 
              width: 150, 
              height: 60, 
              bgcolor: 'background.paper', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider'
            }}>
              <Typography variant="caption">
                Background Paper
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  ),
}; 