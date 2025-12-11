import React, { useState } from 'react';
import { Box, IconButton, Collapse, Typography, useTheme, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PersonasCrud } from './PersonasCrud';
import { ScenariosCrud } from './ScenariosCrud';
import { MoodsCrud } from './MoodsCrud';
import { TemplatesCrud } from './TemplatesCrud';

const MenuBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  // No need to destructure scenarios since ScenariosCrud handles them
  const theme = useTheme();
  const { voiceOptions, selectedVoice, setSelectedVoice } = useVoice();
  const handleToggle = () => {
    setOpen(prev => !prev);
  };

  return (
    <Box sx={{ width: '100%', m: 0, p: 0 }}>
      {/* Header row with login/logout */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 0.5, pt: 0.25, pb: 0.25, bgcolor: theme.palette.background.default, m: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="open menu" onClick={handleToggle} size="small" sx={{ m: 0, p: 0.5 }}>
            <MenuIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 500, textAlign: 'left' }}>
            Scenarios
          </Typography>
        </Box>        {isAuthenticated ? (
          <Button 
            variant="text" 
            size="small" 
            sx={{ borderRadius: 2 }}
            onClick={async () => { await logout(); navigate('/login'); }}
          >
            Logout
          </Button>
        ) : (
          <Button 
            variant="text" 
            size="small" 
            sx={{ borderRadius: 2 }}
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        )}
       </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ px: 0.5, pb: 0.5, pt: 0.25, width: '100%', bgcolor: 'transparent', borderBottom: `1px solid ${theme.palette.divider}`, mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>          {/* Main content in a row */}
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}>
          
          {/* Personas Section with CRUD */}
          <PersonasCrud />          {/* Moods Section with CRUD */}
          <Box sx={{ minWidth: 180, flex: 1.5 }}>
            <MoodsCrud />
              {/* Voices Section - Under Moods */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: '#E91E63' /* pink/magenta */ }}>Voices</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0.5, mb: 2 }}>
                {voiceOptions.map(v => (
                  <Box
                    key={v.value}
                    onClick={() => setSelectedVoice(v.value)}                    sx={{
                      p: 0.75,
                      cursor: 'pointer',
                      borderRadius: 1,
                      border: '2px solid #E91E63', // Pink/magenta border
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: selectedVoice === v.value 
                        ? '#FCE4EC' // Light pink background when selected
                        : 'transparent',
                      transition: 'background 0.2s, border 0.2s',
                      fontSize: '0.85rem',
                      '&:hover': {
                        background: '#FCE4EC' + '80', // Lighter pink on hover
                      },
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500, 
                        fontSize: '0.75rem', // Standardized to 0.75rem
                        lineHeight: 1.1,
                        color: '#E91E63', // Pink/magenta text
                        textAlign: 'center'
                      }}
                    >
                      {v.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>          {/* Templates & Voices - Stacked vertically, more compact */}
          <Box sx={{ minWidth: 200, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Templates Section with CRUD */}
            <TemplatesCrud />
            
            {/* Scenarios Section with CRUD */}
            <ScenariosCrud />
          </Box>
          </Box>
          
          {/* Collapse Triangle - positioned above the gray line */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 1,
            mb: -0.5 // Pull it up closer to content
          }}>
            <IconButton
              onClick={handleToggle}
              sx={{
                color: '#666', // Same color as the gray line
                padding: '4px',
                '&:hover': {
                  color: '#999',
                  backgroundColor: 'transparent',
                },
              }}
              size="small"
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default MenuBar;
