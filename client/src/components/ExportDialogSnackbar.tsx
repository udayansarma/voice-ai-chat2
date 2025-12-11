import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface ExportDialogSnackbarProps {
  open: boolean;
  onClose: () => void;
}

const ExportDialogSnackbar: React.FC<ExportDialogSnackbarProps> = ({ open, onClose }) => (
  <Snackbar
    open={open}
    autoHideDuration={2000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert severity="success" variant="filled" sx={{ fontSize: '0.875rem' }}>
      JSON copied to clipboard!
    </Alert>
  </Snackbar>
);

export default ExportDialogSnackbar;
