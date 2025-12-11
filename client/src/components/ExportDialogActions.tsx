import React from 'react';
import { Box, Button, DialogActions } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface ExportDialogActionsProps {
  onAIEvaluation: () => void;
  isEvaluating: boolean;
  exportDataHasMessages: boolean;
  onDownload: () => void;
  onDownloadPdf: () => void;
  onClose: () => void;
}

const ExportDialogActions: React.FC<ExportDialogActionsProps> = ({
  onAIEvaluation,
  isEvaluating,
  exportDataHasMessages,
  onDownload,
  onDownloadPdf,
  onClose,
}) => (
  <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, pb: 1, gap: 2 }}>
    {/* Left-aligned: AI Evaluation button */}
    <Box>
      <Button
        onClick={onAIEvaluation}
        disabled={isEvaluating || !exportDataHasMessages}
        startIcon={<AssessmentIcon />}
        variant="outlined"
        size="small"
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '.9rem',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          color: 'primary.main',
          borderColor: 'primary.main',
          transition: 'all 0.3s ease',
          mr: 1,
          '&:hover': {
            backgroundColor: 'primary.main',
            color: 'white',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
          },
        }}
      >
        <span style={{ fontWeight: 600 }}>AI Evaluation</span>
      </Button>
    </Box>
    {/* Right-aligned: Download JSON, Download PDF, Close */}
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        onClick={onDownload}
        startIcon={<DownloadIcon />}
        variant="outlined"
        size="small"
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '.9rem',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          color: 'primary.main',
          borderColor: 'primary.main',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'primary.main',
            color: 'white',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
          },
        }}
      >
        <span style={{ fontWeight: 600 }}>JSON</span>
      </Button>
      <Button
        onClick={onDownloadPdf}
        startIcon={<DownloadIcon />}
        variant="outlined"
        size="small"
        disabled={isEvaluating || !exportDataHasMessages}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '.9rem',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          color: 'primary.main',
          borderColor: 'primary.main',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'primary.main',
            color: 'white',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
          },
        }}
      >
        <span style={{ fontWeight: 600 }}>Evaluation</span>
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        onClick={onClose}
        size="small"
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '.9rem',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          color: 'grey.700',
          borderColor: 'grey.300',
          background: 'rgba(255,255,255,0.7)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: theme => theme.palette.primary.main,
            backgroundColor: 'rgba(0, 102, 204, 0.04)',
            color: theme => theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 102, 204, 0.15)',
          },
        }}
      >
        Close
      </Button>
    </Box>
  </DialogActions>
);

export default ExportDialogActions;
