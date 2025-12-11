import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Chip, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MoodIcon from '@mui/icons-material/Mood';
import TheatersIcon from '@mui/icons-material/Theaters';
import DescriptionIcon from '@mui/icons-material/Description';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useTemplate } from '../context/TemplateContext';
import { usePersonaScenario } from '../context/PersonaScenarioContext';
import { useMood } from '../context/MoodContext';
import { useVoice } from '../context/VoiceContext';

// Generate a random user ID for avatar
const getRandomUserId = () => Math.floor(Math.random() * 1000);

interface ChatHeaderProps {
  name?: string;
  avatarUrl?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name = 'Training Agent',
  avatarUrl,
}) => {
  const [randomAvatarUrl, setRandomAvatarUrl] = useState<string>('');
  const { currentTemplate } = useTemplate();  const { selectedPersona, selectedScenario, generatedName } = usePersonaScenario();
  const { selectedMood } = useMood();
  const { selectedVoice, getVoiceByValue } = useVoice();
  const theme = useTheme();
  
  // Create display name: Template Name with Generated Person Name
  let displayName = currentTemplate?.name || name;
  if (generatedName && currentTemplate) {
    displayName = `${currentTemplate.name} with ${generatedName.full}`;
  }

  // Determine which TTS voice will be used and get the display name
  let voiceName = selectedVoice;
  let voiceDisplayName = selectedVoice;
  
  if (!voiceName) {
    // Fallback based on avatar gender
    voiceName = randomAvatarUrl.includes('/men/') ? 'AndrewNeural' : 'JennyNeural';
  }
  
  // Get the friendly display name from voice options
  const voiceOption = getVoiceByValue(voiceName);
  voiceDisplayName = voiceOption ? voiceOption.name : voiceName;

  // Compose chips for persona, mood, scenario, template, and voice
  const chips = [
    selectedPersona && (
      <Chip
        key="persona"
        icon={<PersonIcon />}
        label={`Persona: ${selectedPersona.name}`}
        variant="outlined"
        size="small"
        sx={{
          mr: 1,
          bgcolor: 'background.paper',
          color: theme.palette.primary.main,
          borderColor: theme.palette.primary.light,
          '& .MuiChip-icon': { color: theme.palette.primary.main },
        }}
      />
    ),
    selectedMood && (
      <Chip
        key="mood"
        icon={<MoodIcon />}
        label={`Mood: ${selectedMood.mood}`}
        variant="outlined"
        size="small"
        sx={{
          mr: 1,
          bgcolor: 'background.paper',
          color: theme.palette.warning.main,
          borderColor: theme.palette.warning.light,
          '& .MuiChip-icon': { color: theme.palette.warning.main },
        }}
      />
    ),
    selectedScenario && (
      <Chip
        key="scenario"
        icon={<TheatersIcon />}
        label={`Scenario: ${selectedScenario.title}`}
        variant="outlined"
        size="small"
        sx={{
          mr: 1,
          bgcolor: 'background.paper',
          color: '#7B1FA2',
          borderColor: '#CE93D8',
          '& .MuiChip-icon': { color: '#7B1FA2' },
        }}
      />
    ),
    currentTemplate && (
      <Chip
        key="template"
        icon={<DescriptionIcon />}
        label={`Template: ${currentTemplate.name}`}
        variant="outlined"
        size="small"
        sx={{
          mr: 1,
          bgcolor: 'background.paper',
          color: theme.palette.success.main,
          borderColor: theme.palette.success.light,
          '& .MuiChip-icon': { color: theme.palette.success.main },
        }}
      />
    ),    (
      <Chip
        key="voice"
        icon={<VolumeUpIcon />}
        label={`Voice: ${voiceDisplayName}`}
        variant="outlined"
        size="small"
        sx={{
          bgcolor: 'background.paper',
          color: '#E91E63', // Pink/magenta to match MenuBar voices color
          borderColor: '#F8BBD9', // Light pink border
          '& .MuiChip-icon': { color: '#E91E63' }, // Match icon color to text
        }}
      />
    ),
  ].filter(Boolean);

  useEffect(() => {
    // Use the provided avatarUrl or generate a random one
    if (avatarUrl) {
      setRandomAvatarUrl(avatarUrl);
    } else {
      // Generate a random avatar URL from randomuser.me with timestamp to prevent caching
      const gender = Math.random() > 0.5 ? 'men' : 'women';
      const userId = getRandomUserId();
      const timestamp = new Date().getTime();
      setRandomAvatarUrl(`https://randomuser.me/api/portraits/${gender}/${userId}.jpg?t=${timestamp}`);
    }
  }, [avatarUrl]);  // Fallback to a default avatar with Spectrum styling
  const defaultAvatar = (
    <Avatar
      sx={{
        width: 81,
        height: 81,
        background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
        color: '#ffffff',
        border: '3px solid #ffffff',
        boxShadow: '0 4px 16px rgba(0, 102, 204, 0.3)',
        fontSize: '3rem',
        fontWeight: 600,        mb: 0.75,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: '0 6px 24px rgba(0, 102, 204, 0.4)',
        }
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.5,
        px: 1,
        gap: 0.75,
        position: 'relative',
        zIndex: 10,
        mb: 1.5,
      }}
    >
     {randomAvatarUrl ? (
       <Avatar
         src={randomAvatarUrl}
         alt={name}         sx={{ 
           width: 81, 
           height: 81, 
           mb: 0.75,
           border: '3px solid #ffffff',
           boxShadow: '0 4px 16px rgba(0, 102, 204, 0.2)',
           transition: 'all 0.3s ease',
           '&:hover': {
             transform: 'scale(1.05)',
             boxShadow: '0 6px 24px rgba(0, 102, 204, 0.3)',
           },
           '& img': {
             objectFit: 'cover',
           }
         }}
         onError={() => setRandomAvatarUrl('')}
       />
     ) : (
       defaultAvatar
     )}
     <Typography
       variant="h6"
       sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, textAlign: 'center' }}
     >
       {displayName}
     </Typography>
     <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
       {chips}
     </Box>
   </Box>
  );
};

export default ChatHeader;
