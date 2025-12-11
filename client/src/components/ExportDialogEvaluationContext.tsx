import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Paper, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface EvaluationContextProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  context: any;
}

const ExportDialogEvaluationContext: React.FC<EvaluationContextProps> = ({ expanded, onChange, context }) => (
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
      <Typography variant="subtitle2">Evaluation Context</Typography>
    </AccordionSummary>
    <AccordionDetails>
      {context && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: '#e8f5e8' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.875rem' }}>
            Evaluation Context
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, fontSize: '0.75rem' }}>
            {context.persona && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Persona:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.persona.name}
                </Typography>
              </Box>
            )}
            {context.scenario && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Scenario:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.scenario.title || context.scenario.name || ''}
                </Typography>
              </Box>
            )}
            {context.mood && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Mood:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.mood.mood}
                </Typography>
              </Box>
            )}
            {context.voice && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Voice:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.voice}
                </Typography>
              </Box>
            )}
            {context.generatedName && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Generated Name:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.generatedName.full} ({context.generatedName.gender})
                </Typography>
              </Box>
            )}
            {context.template && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Template:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {context.template.name}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}
    </AccordionDetails>
  </Accordion>
);

export default ExportDialogEvaluationContext;
