import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePersonaScenario } from '../context/PersonaScenarioContext';
import { SimpleDialog, SimpleForm, ConfirmDialog, type SimpleFormRef } from './crud';
import type { Scenario } from '../context/persona-scenario-types';

export const ScenariosCrud: React.FC = () => {
  const { 
    scenarios, 
    selectedScenario, 
    setSelectedScenario, 
    createScenario, 
    updateScenario, 
    deleteScenario  } = usePersonaScenario();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  
  // Form refs
  const createFormRef = useRef<SimpleFormRef>(null);
  const editFormRef = useRef<SimpleFormRef>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    scenario: Scenario;
  } | null>(null);
  // Form field definitions - single JSON field
  const formFields = [
    {
      name: 'scenarioJson',
      label: 'Scenario Data (JSON)',
      multiline: true,
      required: true,
      rows: 12,
      validateJson: true,
      placeholder: JSON.stringify({
        title: "Example Scenario",
        scenario: {
          description: "A detailed scenario description",
          context: {
            device: "smartphone",
            service: "customer support",
            environment: "home office",
            prior_actions: ["contacted support", "provided account details"]
          }
        },
        exit_criteria: {
          description: "Customer issue resolved successfully",
          customer_exit_signals: ["expressed satisfaction", "said thank you", "ended call"]
        },
        evaluation_criteria: {
          identity_validation: ["verified customer identity", "confirmed account access"],
          troubleshooting_steps: ["identified problem", "provided solution", "verified resolution"],
          resolution_confirmation: ["customer confirmed issue resolved", "provided follow-up information"]
        },
        scenario_type: "customer_support",
        difficulty_level: "intermediate",
        expected_duration_seconds: 300
      }, null, 2)
    }
  ];

  // Handlers
  const handleContextMenu = (event: React.MouseEvent, scenario: Scenario) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      scenario,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setIsEditDialogOpen(true);
    handleCloseContextMenu();
  };

  const handleDelete = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setIsDeleteDialogOpen(true);
    handleCloseContextMenu();
  };
  // Form submission handlers
  const handleCreateSubmit = async (data: Record<string, string>) => {
    try {
      const scenarioData = JSON.parse(data.scenarioJson);
      
      // Validate required fields
      if (!scenarioData.title || typeof scenarioData.title !== 'string') {
        throw new Error('Scenario title is required');
      }
      
      // Remove id if present (backend will assign it)
      const { id, ...scenarioWithoutId } = scenarioData;
      
      await createScenario(scenarioWithoutId);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating scenario:', error);
      // Error will be handled by the form validation or shown in console
    }
  };

  const handleEditSubmit = async (data: Record<string, string>) => {
    if (!editingScenario) return;
    
    try {
      const scenarioData = JSON.parse(data.scenarioJson);
      
      // Validate required fields
      if (!scenarioData.title || typeof scenarioData.title !== 'string') {
        throw new Error('Scenario title is required');
      }
      
      // Remove id if present (use existing scenario id)
      const { id, ...updateData } = scenarioData;
      
      await updateScenario(editingScenario.id, updateData);
      setIsEditDialogOpen(false);
      setEditingScenario(null);
    } catch (error) {
      console.error('Error updating scenario:', error);
      // Error will be handled by the form validation or shown in console
    }
  };

  const handleDeleteConfirm = async () => {
    if (!editingScenario) return;
    await deleteScenario(editingScenario.id);
    setIsDeleteDialogOpen(false);
    setEditingScenario(null);
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
    setEditingScenario(null);
  };

  return (
    <Box sx={{ minWidth: 260, flex: 2 }}>
      {/* Section header with Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          color: '#9c27b0', // Purple color
          fontSize: '0.875rem' // Smaller header to match MenuBar style
        }}>
          Scenarios
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ 
            color: '#9c27b0', // Purple color
            '&:hover': { backgroundColor: '#9c27b0' + '10' }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>      {/* Scenarios grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0.5, mb: 2 }}>
        {scenarios.map(s => (
          <Box
            key={s.id}
            onClick={() => setSelectedScenario(s)}
            onContextMenu={(e) => handleContextMenu(e, s)}            sx={{
              p: 0.75,
              cursor: 'pointer',
              borderRadius: 1,
              border: `2px solid #9c27b0`, // Purple border
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selectedScenario?.id === s.id 
                ? '#e1bee7' // Light purple background for selected
                : 'transparent',
              transition: 'background 0.2s, border 0.2s',
              fontSize: '0.85rem',
              '&:hover': {
                background: '#f3e5f5', // Very light purple on hover
              },
            }}
          >
            <Typography 
              variant="body2"
              sx={{ 
                fontWeight: 500, 
                fontSize: '0.75rem', // Match original MenuBar scenario name size
                lineHeight: 1.1,
                color: '#9c27b0', // Purple text color
                textAlign: 'center'
              }}
            >
              {s.title}
            </Typography>
          </Box>
        ))}
      </Box>{/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
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
        <MenuItem onClick={() => contextMenu && handleEdit(contextMenu.scenario)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => contextMenu && handleDelete(contextMenu.scenario)}
          sx={{ color: '#d32f2f' }} // Red color for delete action
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <SimpleDialog
        open={isCreateDialogOpen}
        onClose={handleCreateCancel}
        title="Create New Scenario"
        onSave={handleCreateSave}
        onCancel={handleCreateCancel}
      >
        <SimpleForm
          ref={createFormRef}
          fields={formFields}
          onSubmit={handleCreateSubmit}
        />
      </SimpleDialog>      {/* Edit Dialog */}
      <SimpleDialog
        open={isEditDialogOpen}
        onClose={handleEditCancel}
        title={`Edit Scenario: ${editingScenario?.title || ''}`}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
      >        <SimpleForm
          key={`edit-${editingScenario?.id || 'none'}`} // Force re-render when editing different scenario
          ref={editFormRef}
          fields={formFields}
          onSubmit={handleEditSubmit}
          initialData={editingScenario ? {
            scenarioJson: JSON.stringify(
              // Remove the id and use all other properties
              Object.fromEntries(
                Object.entries(editingScenario).filter(([key]) => key !== 'id')
              ),
              null,
              2
            )
          } : undefined}
        />
      </SimpleDialog>      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setEditingScenario(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Scenario"
        message={`Are you sure you want to delete "${editingScenario?.title}"? This action cannot be undone.`}
      />
    </Box>
  );
};
