import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Paper, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface StatisticsProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  totalTokens: number;
  messageCount: number;
  displayDuration: string;
  stats: { speechDurationSeconds: number; audioCharacterCount: number } | null;
}

const ExportDialogStatistics: React.FC<StatisticsProps> = ({ expanded, onChange, totalTokens, messageCount, displayDuration, stats }) => (
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
      <Typography variant="subtitle2">Statistics</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: '#f8f9fa' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.875rem' }}>
          Statistics
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          {/* First row: Tokens, Messages, Duration */}
          <Box textAlign="center" sx={{ flex: 1 }}>
            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
              {totalTokens.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              Tokens
            </Typography>
          </Box>
          <Box textAlign="center" sx={{ flex: 1 }}>
            <Typography variant="h6" color="secondary" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
              {messageCount}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              Messages
            </Typography>
          </Box>
          <Box textAlign="center" sx={{ flex: 1 }}>
            <Typography variant="h6" color="success.main" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
              {displayDuration}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              Duration
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          {/* Second row: Avg/Msg, Speech Secs (export duration), Audio Chars */}
          <Box textAlign="center" sx={{ flex: 1 }}>
            <Typography variant="h6" color="warning.main" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
              {messageCount > 0 ? Math.round(totalTokens / messageCount) : 0}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              Avg/Msg
            </Typography>
          </Box>          {stats && (
            <>
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Typography variant="h6" color="info.main" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                  {(stats.speechDurationSeconds ?? 0).toFixed(2)} s
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Speech Secs
                </Typography>
              </Box>
              <Box textAlign="center" sx={{ flex: 1 }}>
                <Typography variant="h6" color="info.dark" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                  {(stats.audioCharacterCount ?? 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Audio Chars
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </AccordionDetails>
  </Accordion>
);

export default ExportDialogStatistics;
