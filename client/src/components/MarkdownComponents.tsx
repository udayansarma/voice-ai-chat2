import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';

/**
 * Custom markdown components for better chat bubble formatting.
 * Extracted from MessageList for reuse and maintainability.
 */
export const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="body2" sx={{ mb: 0.5, whiteSpace: 'pre-line' }}>{children}</Typography>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <Box component="code" sx={{ bgcolor: 'grey.200', px: 0.5, py: 0.1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.97em' }}>{children}</Box>
    ) : (
      <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 2, overflowX: 'auto', my: 1, fontFamily: 'monospace', fontSize: '0.97em' }}>
        <code>{children}</code>
      </Box>
    ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <MuiLink {...props} target="_blank" rel="noopener noreferrer" sx={{ color: 'primary.main', textDecoration: 'underline' }}>{props.children}</MuiLink>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <Box component="ul" sx={{ pl: 3, mb: 0.5 }}>{children}</Box>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <Box component="ol" sx={{ pl: 3, mb: 0.5 }}>{children}</Box>
  ),  li: ({ children }: { children?: React.ReactNode }) => (
    <Typography component="li" variant="body2" sx={{ mb: 0.25 }}>{children}</Typography>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <Box component="blockquote" sx={{ borderLeft: '3px solid #90caf9', pl: 2, color: 'text.secondary', fontStyle: 'italic', my: 1 }}>{children}</Box>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <Box component="strong" sx={{ fontWeight: 700 }}>{children}</Box>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <Box component="em" sx={{ fontStyle: 'italic' }}>{children}</Box>
  ),
};
