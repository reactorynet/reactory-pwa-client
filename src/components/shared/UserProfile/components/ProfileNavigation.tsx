import React from 'react';
import {
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  useTheme
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { ProfileNavigationProps } from '../types';

/**
 * Navigation component for profile sections
 * Supports tabs, sidebar, and accordion layouts
 */
export const ProfileNavigation: React.FC<ProfileNavigationProps> = ({
  sections,
  currentSection,
  onSectionChange,
  type,
  position,
  className
}) => {
  const theme = useTheme();

  // Get icon for section
  const getSectionIcon = (iconName?: string) => {
    // For now, return a simple text representation
    // In a real implementation, you'd map to Material-UI icons
    return iconName ? iconName.charAt(0).toUpperCase() : '•';
  };

  // Render tab navigation
  const renderTabs = () => (
    <Paper
      className={className}
      sx={{
        mb: 2,
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      <Tabs
        value={currentSection}
        onChange={(_, newValue) => onSectionChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper,
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 'medium',
            minWidth: 120,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText
            }
          }
        }}
      >
        {sections.map((section) => (
          <Tab
            key={section.id}
            value={section.id}
            label={section.title}
            icon={
              <Box sx={{
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {getSectionIcon(section.icon)}
              </Box>
            }
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Paper>
  );

  // Render sidebar navigation
  const renderSidebar = () => (
    <Paper
      className={className}
      sx={{
        width: position === 'left' ? 280 : 'auto',
        height: 'fit-content',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      <List sx={{ py: 1 }}>
        {sections.map((section) => (
          <ListItem key={section.id} disablePadding>
            <ListItemButton
              selected={currentSection === section.id}
              onClick={() => onSectionChange(section.id)}
              sx={{
                py: 1.5,
                px: 2,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark
                  }
                }
              }}
            >
              <ListItemIcon sx={{
                minWidth: 40,
                color: currentSection === section.id ? 'inherit' : 'text.secondary'
              }}>
                <Box sx={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  backgroundColor: currentSection === section.id
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.04)'
                }}>
                  {getSectionIcon(section.icon)}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: currentSection === section.id ? 'bold' : 'medium',
                      fontSize: '0.875rem'
                    }}
                  >
                    {section.title}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  // Render accordion navigation
  const renderAccordion = () => (
    <Box className={className} sx={{ mb: 2 }}>
      {sections.map((section) => (
        <Accordion
          key={section.id}
          expanded={currentSection === section.id}
          onChange={() => onSectionChange(section.id)}
          sx={{
            mb: 1,
            boxShadow: 1,
            '&:before': { display: 'none' },
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              backgroundColor: currentSection === section.id
                ? theme.palette.primary.main
                : theme.palette.background.paper,
              color: currentSection === section.id
                ? theme.palette.primary.contrastText
                : theme.palette.text.primary,
              '&:hover': {
                backgroundColor: currentSection === section.id
                  ? theme.palette.primary.dark
                  : theme.palette.action.hover
              },
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            <Box sx={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '50%',
              backgroundColor: currentSection === section.id
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.04)'
            }}>
              {getSectionIcon(section.icon)}
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: currentSection === section.id ? 'bold' : 'medium',
                fontSize: '0.875rem'
              }}
            >
              {section.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {/* Content can be added here if needed */}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  // Render based on navigation type
  switch (type) {
    case 'sidebar':
      return renderSidebar();
    case 'accordion':
      return renderAccordion();
    case 'tabs':
    default:
      return renderTabs();
  }
};
