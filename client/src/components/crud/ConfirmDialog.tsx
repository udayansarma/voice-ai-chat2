import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  useTheme
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message,
  itemName,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false
}) => {
  const theme = useTheme();

  const defaultMessage = itemName 
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : 'Are you sure you want to delete this item? This action cannot be undone.';

  const displayMessage = message || defaultMessage;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >      <DialogTitle sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        pb: 1,
        fontSize: '0.8rem', // Smaller dialog title
        fontWeight: 600
      }}>
        <WarningAmberIcon 
          sx={{ 
            color: theme.palette.warning.main,
            fontSize: '1rem' // Smaller icon to match text
          }} 
        />
        {title}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>        <Typography variant="body1" color="text.secondary" sx={{ 
          fontSize: '0.7rem' // Smaller message text
        }}>
          {displayMessage}
        </Typography>
      </DialogContent>      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          size="small"
          sx={{ 
            minWidth: 80,
            fontSize: '0.75rem',
            borderRadius: 1,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            }
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          size="small"
          sx={{ 
            minWidth: 80,
            fontSize: '0.75rem',
            borderRadius: 1,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: theme.palette.error.dark,
            }
          }}
        >
          {loading ? 'Deleting...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
