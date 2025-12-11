import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTemplate } from '../context/TemplateContext';
import { SimpleDialog, SimpleForm, ConfirmDialog, type SimpleFormRef } from './crud';
import type { Template } from '../context/template-types';

// Simple YAML validation function
const validateYaml = (yamlString: string): { isValid: boolean; error?: string } => {
  if (!yamlString.trim()) {
    return { isValid: false, error: 'YAML content is required' };
  }
  
  // Basic YAML structure validation
  try {
    // Check for basic YAML patterns
    const lines = yamlString.split('\n');
    let hasValidStructure = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for key-value pairs or list items
        if (trimmed.includes(':') || trimmed.startsWith('-')) {
          hasValidStructure = true;
          break;
        }
      }
    }
    
    if (!hasValidStructure) {
      return { isValid: false, error: 'Invalid YAML structure - must contain key-value pairs or lists' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid YAML format' };
  }
};

export const TemplatesCrud: React.FC = () => {
  const { 
    templates, 
    currentTemplate,
    setCurrentTemplate,
    createTemplate, 
    updateTemplate, 
    deleteTemplate   } = useTemplate();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Form refs
  const createFormRef = useRef<SimpleFormRef>(null);
  const editFormRef = useRef<SimpleFormRef>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    template: Template;
  } | null>(null);

  // Form field definitions - name and YAML prompt
  const formFields = [
    {
      name: 'name',
      label: 'Template Name',
      required: true,
      placeholder: 'Enter template name...'
    },
    {
      name: 'prompt',
      label: 'Prompt Template (YAML)',
      multiline: true,
      required: true,
      rows: 12,
      validateYaml: true,
      placeholder: `# Example YAML prompt template
role: assistant
context: |
  You are a helpful AI assistant specialized in...
instructions:
  - Be clear and concise
  - Provide examples when helpful
  - Ask clarifying questions if needed
parameters:
  temperature: 0.7
  max_tokens: 1000`
    }
  ];  // Handlers
  const handleTemplateSelect = (template: Template) => {
    setCurrentTemplate(template);  // Sets both active template and UI highlighting
  };

  const handleRightClick = (event: React.MouseEvent, template: Template) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      template,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };  const handleEditClick = (template: Template) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
    handleContextMenuClose();
  };

  const handleDeleteClick = (template: Template) => {
    setEditingTemplate(template);
    setIsDeleteDialogOpen(true);
    handleContextMenuClose();
  };
  const handleCreateSubmit = async (formData: Record<string, string>) => {
    try {
      const templateData = {
        name: formData.name.trim(),
        prompt: formData.prompt.trim()
      };

      // Validate YAML
      const yamlValidation = validateYaml(templateData.prompt);
      if (!yamlValidation.isValid) {
        throw new Error(yamlValidation.error || 'Invalid YAML format');
      }

      await createTemplate(templateData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating template:', error);
      // Error will be handled by the form validation or shown in console
    }
  };

  const handleEditSubmit = async (formData: Record<string, string>) => {
    if (!editingTemplate) return;
    
    try {
      const updates = {
        name: formData.name.trim(),
        prompt: formData.prompt.trim()
      };

      // Validate YAML
      const yamlValidation = validateYaml(updates.prompt);
      if (!yamlValidation.isValid) {
        throw new Error(yamlValidation.error || 'Invalid YAML format');
      }

      await updateTemplate(editingTemplate.id, updates);
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
      // Error will be handled by the form validation or shown in console
    }
  };
  const handleDeleteConfirm = async () => {
    if (!editingTemplate) return;
    
    try {
      await deleteTemplate(editingTemplate.id);
      setIsDeleteDialogOpen(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      // Could add error handling here
    }
  };

  // Dialog button handlers
  const handleCreateSave = () => {
    createFormRef.current?.submit();
  };

  const handleEditSave = () => {
    editFormRef.current?.submit();
  };

  const handleCreateCancel = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setEditingTemplate(null);
  };
  return (
    <Box sx={{ minWidth: 260, flex: 2 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}><Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          color: '#4caf50', // Green color for templates
          fontSize: '0.875rem' // Smaller header to match MenuBar style
        }}>
          Templates
        </Typography>
        <IconButton
          size="small"
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ 
            color: '#4caf50', // Green color
            '&:hover': { backgroundColor: '#4caf50' + '10' }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>      {/* Templates Grid - 2 columns for template names */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0.5, mb: 2 }}>
        {templates.map((template) => (
          <Box
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            onContextMenu={(e) => handleRightClick(e, template)}            sx={{
              p: 0.75,
              cursor: 'pointer',
              borderRadius: 1,
              border: `2px solid #4caf50`, // Green border
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: currentTemplate?.id === template.id 
                ? '#c8e6c9' // Light green background for selected
                : 'transparent',
              transition: 'background 0.2s, border 0.2s',
              fontSize: '0.85rem',
              '&:hover': {
                background: '#e8f5e8', // Very light green on hover
              },
            }}
          >
            <Typography 
              variant="body2"
              sx={{ 
                fontWeight: 500, 
                fontSize: '0.75rem', // Match original MenuBar template name size
                lineHeight: 1.1,
                color: '#4caf50', // Green text color
                textAlign: 'center'
              }}
            >
              {template.name}
            </Typography>
          </Box>
        ))}
      </Box>{/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            '& .MuiMenuItem-root': {
              fontSize: '0.75rem' // Match MenuBar font sizes
            }
          }
        }}
      >
        <MenuItem onClick={() => contextMenu && handleEditClick(contextMenu.template)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => contextMenu && handleDeleteClick(contextMenu.template)}
          sx={{ color: '#d32f2f' }} // Red color for delete action
        >
          Delete
        </MenuItem>
      </Menu>{/* Create Dialog */}
      <SimpleDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreateSave}
        onCancel={handleCreateCancel}
        title="Create New Template"
        saveLabel="Create"
      >        <SimpleForm
          ref={createFormRef}
          fields={formFields}
          onSubmit={handleCreateSubmit}
          validateYaml={validateYaml}
        />
      </SimpleDialog>      {/* Edit Dialog */}
      <SimpleDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
        title={`Edit Template: ${editingTemplate?.name || ''}`}
        saveLabel="Update"
      >        <SimpleForm
          key={`edit-${editingTemplate?.id || 'none'}`} // Force re-render when editing different template
          ref={editFormRef}
          fields={formFields}
          initialData={editingTemplate ? {
            name: editingTemplate.name,
            prompt: editingTemplate.prompt
          } : undefined}
          onSubmit={handleEditSubmit}
          validateYaml={validateYaml}
        />
      </SimpleDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${editingTemplate?.name}"? This action cannot be undone.`}
      />
    </Box>
  );
};
