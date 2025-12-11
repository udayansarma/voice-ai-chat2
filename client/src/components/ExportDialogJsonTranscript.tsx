import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface JsonTranscriptProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  exportJson: string | null;
  copySuccess: boolean;
  onCopy: () => void;
}

const ExportDialogJsonTranscript: React.FC<JsonTranscriptProps> = ({ expanded, onChange, exportJson, copySuccess, onCopy }) => (
  <Accordion disableGutters square expanded={expanded} onChange={onChange} sx={{ boxShadow: 'none', mb: 1, '&:focus-within': { outline: 'none' } }}>
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      disableRipple
      sx={{
        outline: 'none',
        '&:focus': { outline: 'none' },
        '&:focus-visible': { outline: 'none' },
        '&.Mui-focusVisible': { outline: 'none', backgroundColor: 'transparent' },
        '&.Mui-expanded': { backgroundColor: 'transparent' }
      }}
    >
      <Typography variant="subtitle2">JSON Transcript</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 0.5 }}>
        <Tooltip title={copySuccess ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton onClick={onCopy} size="small">
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          bgcolor: '#f5f5f5',
          p: 1,
          borderRadius: 1,
          maxHeight: 180,
          overflow: 'auto',
          fontSize: '0.7rem',
          fontFamily: 'monospace'
        }}
      >
        {exportJson}
      </Box>
    </AccordionDetails>
  </Accordion>
);

export default ExportDialogJsonTranscript;
