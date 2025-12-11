import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SimpleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
  loading?: boolean;
}

const SimpleDialog: React.FC<SimpleDialogProps> = ({
  open,
  onClose,
  title,
  children,
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  saveDisabled = false,
  loading = false
}) => {
  const theme = useTheme();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 200
        }
      }}
    >      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
        pr: 1,
        fontSize: '0.8rem', // Smaller dialog title
        fontWeight: 600
      }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: theme.palette.grey[500],
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {children}
      </DialogContent>      {(onSave || onCancel) && (        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancel}
            variant="outlined"
            disabled={loading}
            size="small"
            sx={{ 
              fontSize: '0.75rem',
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            {cancelLabel}
          </Button>
          {onSave && (
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saveDisabled || loading}
              size="small"
              sx={{ 
                ml: 1,
                fontSize: '0.75rem',
                borderRadius: 1,
                textTransform: 'none'
              }}
            >
              {loading ? 'Saving...' : saveLabel}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default SimpleDialog;
