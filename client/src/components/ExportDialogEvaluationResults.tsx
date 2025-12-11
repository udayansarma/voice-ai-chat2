import type { RefObject } from 'react';
import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Paper, Typography, Box, Alert, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EvaluationResultsProps {
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  evaluationError: unknown;
  lastEvaluation: any;
  evaluationPdfRef: RefObject<HTMLDivElement>;
  markdownText: string;
  isEvaluating: boolean;
}

const ExportDialogEvaluationResults: React.FC<EvaluationResultsProps> = ({
  expanded,
  onChange,
  evaluationError,
  lastEvaluation,
  evaluationPdfRef,
  markdownText,
  isEvaluating,
}) => (
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
      <Typography variant="subtitle2">AI Evaluation Results</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" />
          AI Evaluation Results
        </Typography>
        {isEvaluating ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <CircularProgress color="primary" size={48} thickness={4} />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Evaluating conversation...
            </Typography>
          </Box>
        ) : (
          <>
            {evaluationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {String(evaluationError)}
              </Alert>
            )}
            {lastEvaluation && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Generated: {new Date(lastEvaluation.timestamp).toLocaleString()}
                </Typography>
                <Paper
                  ref={evaluationPdfRef}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
                    fontSize: '0.93rem',
                    '& h1': {
                      fontSize: '1.18rem',
                      fontWeight: 700,
                      margin: '1.2em 0 0.7em 0',
                      lineHeight: 1.2,
                    },
                    '& h2': {
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      margin: '1.1em 0 0.6em 0',
                      lineHeight: 1.25,
                    },
                    '& h3, & h4, & h5, & h6': {
                      fontSize: '0.98rem',
                      fontWeight: 600,
                      margin: '1em 0 0.5em 0',
                      lineHeight: 1.3,
                    },
                    '& p, & li': {
                      fontSize: '0.91rem',
                      lineHeight: 1.6,
                      margin: '0.3em 0',
                    },
                    '& ul, & ol': {
                      paddingLeft: '1.15em',
                      margin: '0.5em 0 0.5em 0',
                    },
                    '& li': {
                      marginBottom: '0.2em',
                      paddingLeft: '0.1em',
                    },
                    '& strong': {
                      fontWeight: 700,
                    },
                    '& blockquote': {
                      borderLeft: '3px solid #b3c6e0',
                      margin: '0.7em 0',
                      padding: '0.5em 1em',
                      color: 'text.secondary',
                      background: '#f7faff',
                      fontSize: '0.89rem',
                    },
                    '& code': {
                      fontFamily: 'monospace',
                      fontSize: '0.89em',
                      background: '#f5f5f5',
                      px: 0.5,
                      borderRadius: 1,
                    },
                    '& table': {
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.91rem',
                    },
                    '& th, & td': {
                      border: '1px solid #e0e0e0',
                      padding: '0.4em 0.7em',
                    },
                    '& th': {
                      background: '#f5f7fa',
                      fontWeight: 700,
                    },
                    '& > :first-of-type': {
                      marginTop: 0,
                    },
                    '& > :last-of-type': {
                      marginBottom: 0,
                    },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownText}</ReactMarkdown>
                </Paper>
              </Box>
            )}
          </>
        )}
      </Paper>
    </AccordionDetails>
  </Accordion>
);

export default ExportDialogEvaluationResults;
