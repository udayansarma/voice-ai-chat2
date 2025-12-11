import { Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { AvatarProps as MuiAvatarProps } from '@mui/material/Avatar';
import type { SxProps, Theme } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface AIAvatarProps extends MuiAvatarProps {
  size?: number | string;
  sx?: SxProps<Theme>;
}

export const AIAvatar = ({ size = 40, sx, ...props }: AIAvatarProps) => {
  const theme = useTheme();
  
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        border: `2px solid ${theme.palette.primary.dark}`,
        ...sx,
      }}
      {...props}
    >
      <SmartToyIcon sx={{ fontSize: `calc(${size} * 0.6)` }} />
    </Avatar>
  );
};

export default AIAvatar;
