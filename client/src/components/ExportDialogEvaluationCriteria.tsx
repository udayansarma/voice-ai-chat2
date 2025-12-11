import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface EvaluationCriteriaProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  evaluationCriteria: any;
}

const ExportDialogEvaluationCriteria: React.FC<EvaluationCriteriaProps> = ({ expanded, onChange, evaluationCriteria }) => {
  if (!evaluationCriteria.suggestedEvaluationAreas) return null;
  return (
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
        <Typography variant="subtitle2">Evaluation Criteria</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ p: 1.5, mb: 1.5, bgcolor: '#fff3e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {evaluationCriteria.scenarioDetails?.title
              ? `Evaluation Criteria - ${evaluationCriteria.scenarioDetails.title}`
              : 'Suggested Evaluation Areas'}
          </Typography>
          {evaluationCriteria.scenarioDetails && (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                <strong>Type:</strong> {evaluationCriteria.scenarioDetails.scenarioType}
                {evaluationCriteria.scenarioDetails.difficultyLevel && (
                  <span> | <strong>Difficulty:</strong> {evaluationCriteria.scenarioDetails.difficultyLevel}</span>
                )}
                {evaluationCriteria.scenarioDetails.expectedDurationSeconds && (
                  <span> | <strong>Expected Duration:</strong> {Math.round(evaluationCriteria.scenarioDetails.expectedDurationSeconds / 60)} min</span>
                )}
              </Typography>
              {evaluationCriteria.scenarioDetails.description && (
                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                  {evaluationCriteria.scenarioDetails.description}
                </Typography>
              )}
            </Box>
          )}
          {evaluationCriteria.suggestedEvaluationAreas?.length > 0 && (
            <Box sx={{ pl: 0 }}>
              {evaluationCriteria.suggestedEvaluationAreas.map((area: string, idx: number) => (
                <Typography
                  key={idx}
                  variant="body2"
                  sx={{ fontSize: '0.75rem', mb: 0.5, fontWeight: area.includes(':') ? 600 : 400 }}
                >
                  {area}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default ExportDialogEvaluationCriteria;
