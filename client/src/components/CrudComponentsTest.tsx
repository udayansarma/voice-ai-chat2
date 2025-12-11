import React, { useState } from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { SimpleDialog, SimpleForm, ConfirmDialog } from './crud';
import type { FormField } from './crud';

/**
 * Test component to verify CRUD components work correctly
 * This can be temporarily added to your app for testing
 */
const CrudComponentsTest: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Sample form fields for testing
  const testFields: FormField[] = [
    { name: 'name', label: 'Name', required: true, maxLength: 100 },
    { name: 'description', label: 'Description', multiline: true, maxLength: 500 }
  ];

  const handleFormSubmit = async (data: Record<string, string>) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Form submitted:', data);
    setFormData(data);
    setLoading(false);
    setDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    
    // Simulate delete API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Item deleted');
    setLoading(false);
    setConfirmOpen(false);
    setFormData({});
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        CRUD Components Test
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          Test Form Dialog
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          onClick={() => setConfirmOpen(true)}
          disabled={!formData.name}
        >
          Test Delete Confirmation
        </Button>
      </Box>

      {formData.name && (
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6">Current Data:</Typography>
          <Typography><strong>Name:</strong> {formData.name}</Typography>
          {formData.description && (
            <Typography><strong>Description:</strong> {formData.description}</Typography>
          )}
        </Box>
      )}

      {/* Test SimpleDialog with SimpleForm */}
      <SimpleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Test Form"
        onSave={() => {
          // The form will handle submission through its onSubmit
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }}
        onCancel={() => setDialogOpen(false)}
        saveDisabled={loading}
        loading={loading}
      >
        <SimpleForm
          fields={testFields}
          onSubmit={handleFormSubmit}
          initialData={formData}
          loading={loading}
        />
      </SimpleDialog>

      {/* Test ConfirmDialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={formData.name}
        loading={loading}
      />
    </Container>
  );
};

export default CrudComponentsTest;
