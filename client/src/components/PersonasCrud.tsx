import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePersonaScenario } from '../context/PersonaScenarioContext';
import { SimpleDialog, SimpleForm, ConfirmDialog, type SimpleFormRef } from './crud';
import type { Persona } from '../context/persona-scenario-types';

export const PersonasCrud: React.FC = () => {
  const { 
    personas, 
    selectedPersona, 
    setSelectedPersona, 
    createPersona, 
    updatePersona, 
    deletePersona 
  } = usePersonaScenario();
  
  const theme = useTheme();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  // Form refs
  const createFormRef = useRef<SimpleFormRef>(null);
  const editFormRef = useRef<SimpleFormRef>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    persona: Persona;  } | null>(null);  // Form field definitions - single JSON field
  const formFields = [
    {
      name: 'personaJson',
      label: 'Persona Data (JSON)',
      multiline: true,
      required: true,
      rows: 12,
      validateJson: true,
      placeholder: JSON.stringify({
        name: "Example Persona",
        demographics: {
          ageGroup: "25-35",
          role: "Software Developer"
        },
        behavior: "Tech-savvy, detail-oriented, prefers clear instructions",
        needs: "Clear documentation, efficient tools, good examples",
        painpoints: "Slow processes, unclear requirements, complex interfaces"
      }, null, 2)
    }
  ];

  // Handlers
  const handleContextMenu = (event: React.MouseEvent, persona: Persona) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      persona,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setIsEditDialogOpen(true);
    handleCloseContextMenu();
  };

  const handleDelete = (persona: Persona) => {
    setEditingPersona(persona);
    setIsDeleteDialogOpen(true);
    handleCloseContextMenu();
  };  // Form submission handlers
  const handleCreateSubmit = async (data: Record<string, string>) => {
    try {
      const personaData = JSON.parse(data.personaJson);
      
      // Validate required fields
      if (!personaData.name || typeof personaData.name !== 'string') {
        throw new Error('Persona name is required');
      }
      
      // Remove id if present (backend will assign it)
      const { id, ...personaWithoutId } = personaData;
      
      await createPersona(personaWithoutId);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating persona:', error);
      // Error will be handled by the form validation or shown in console
    }
  };  const handleEditSubmit = async (data: Record<string, string>) => {
    if (!editingPersona) return;
    
    try {
      const personaData = JSON.parse(data.personaJson);
      
      // Validate required fields
      if (!personaData.name || typeof personaData.name !== 'string') {
        throw new Error('Persona name is required');
      }
      
      // Remove id if present (use existing persona id)
      const { id, ...updateData } = personaData;
      
      await updatePersona(editingPersona.id, updateData);
      setIsEditDialogOpen(false);
      setEditingPersona(null);
    } catch (error) {
      console.error('Error updating persona:', error);
      // Error will be handled by the form validation or shown in console
    }
  };
  const handleDeleteConfirm = async () => {
    if (!editingPersona) return;
    await deletePersona(editingPersona.id);
    setIsDeleteDialogOpen(false);
    setEditingPersona(null);
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
    setEditingPersona(null);
  };

  return (
    <Box sx={{ minWidth: 260, flex: 2 }}>      {/* Section header with Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          color: theme.palette.primary.main,
          fontSize: '0.875rem' // Smaller header to match MenuBar style
        }}>
          Personas
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ 
            color: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.main + '10' }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>      {/* Personas grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0.5, mb: 2 }}>
        {personas.map(p => (
          <Box
            key={p.id}
            onClick={() => setSelectedPersona(p)}
            onContextMenu={(e) => handleContextMenu(e, p)}            sx={{
              p: 0.75,
              cursor: 'pointer',
              borderRadius: 1,
              border: `2px solid ${theme.palette.primary.main}`,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selectedPersona?.id === p.id 
                ? theme.palette.primary.light + '20'
                : 'transparent',
              transition: 'background 0.2s, border 0.2s',
              fontSize: '0.85rem',
              '&:hover': {
                background: theme.palette.primary.light + '10',
              },
            }}
          >            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                fontSize: '0.75rem', // Match original MenuBar persona name size                lineHeight: 1.1,
                color: theme.palette.primary.main,
                textAlign: 'center'
              }}
            >
              {p.name}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }        PaperProps={{
          sx: {
            '& .MuiMenuItem-root': {
              fontSize: '0.75rem' // Match MenuBar font sizes
            }
          }
        }}
      >        <MenuItem onClick={() => contextMenu && handleEdit(contextMenu.persona)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => contextMenu && handleDelete(contextMenu.persona)}
          sx={{ color: '#d32f2f' }} // Red color for delete action
        >
          Delete
        </MenuItem>
      </Menu>      {/* Create Dialog */}
      <SimpleDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreateSave}
        onCancel={handleCreateCancel}
        title="Create New Persona"
        saveLabel="Create"
      >
        <SimpleForm
          ref={createFormRef}
          fields={formFields}
          onSubmit={handleCreateSubmit}
        />
      </SimpleDialog>

      {/* Edit Dialog */}
      <SimpleDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
        title="Edit Persona"
        saveLabel="Update"
      >        <SimpleForm
          key={`edit-${editingPersona?.id || 'none'}`} // Force re-render when editing different persona
          ref={editFormRef}
          fields={formFields}
          initialData={editingPersona ? {
            personaJson: JSON.stringify({
              name: editingPersona.name,
              ...(editingPersona.demographics && { demographics: editingPersona.demographics }),
              ...(editingPersona.behavior && { behavior: editingPersona.behavior }),
              ...(editingPersona.needs && { needs: editingPersona.needs }),
              ...(editingPersona.painpoints && { painpoints: editingPersona.painpoints })
            }, null, 2)
          } : undefined}
          onSubmit={handleEditSubmit}
        />
      </SimpleDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Persona"
        message={`Are you sure you want to delete "${editingPersona?.name}"? This action cannot be undone.`}
      />
    </Box>
  );
};

export default PersonasCrud;
