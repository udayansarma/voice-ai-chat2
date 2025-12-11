import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMood } from '../context/MoodContext';
import { SimpleDialog, SimpleForm, ConfirmDialog, type SimpleFormRef } from './crud';
import type { Mood } from '../context/mood-types';

export const MoodsCrud: React.FC = () => {  const { 
    moods, 
    selectedMood, 
    setSelectedMood, 
    createMood, 
    updateMood, 
    deleteMood 
  } = useMood();
  
  const theme = useTheme();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMood, setEditingMood] = useState<Mood | null>(null);
  
  // Form refs
  const createFormRef = useRef<SimpleFormRef>(null);
  const editFormRef = useRef<SimpleFormRef>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    mood: Mood;
  } | null>(null);

  // Form field definitions - single JSON field
  const formFields = [
    {
      name: 'moodJson',
      label: 'Mood Data (JSON)',
      multiline: true,
      required: true,
      rows: 8,
      validateJson: true,
      placeholder: JSON.stringify({
        mood: "Calm",
        description: "Relaxed and composed, speaking slowly and thoughtfully"
      }, null, 2)
    }
  ];

  // Handlers
  const handleContextMenu = (event: React.MouseEvent, mood: Mood) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      mood,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = (mood: Mood) => {
    setEditingMood(mood);
    setIsEditDialogOpen(true);
    handleCloseContextMenu();
  };

  const handleDelete = (mood: Mood) => {
    setEditingMood(mood);
    setIsDeleteDialogOpen(true);
    handleCloseContextMenu();
  };

  // Form submission handlers
  const handleCreateSubmit = async (data: Record<string, string>) => {
    try {
      const moodData = JSON.parse(data.moodJson);
      
      // Validate required fields
      if (!moodData.mood || typeof moodData.mood !== 'string') {
        throw new Error('Mood name is required');
      }
      
      // Remove id if present (backend will assign it)
      const { id, ...moodWithoutId } = moodData;
      
      await createMood(moodWithoutId);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating mood:', error);
      // Error will be handled by the form validation or shown in console
    }
  };

  const handleEditSubmit = async (data: Record<string, string>) => {
    if (!editingMood) return;
    
    try {
      const moodData = JSON.parse(data.moodJson);
      
      // Validate required fields
      if (!moodData.mood || typeof moodData.mood !== 'string') {
        throw new Error('Mood name is required');
      }
      
      // Remove id if present (use existing mood id)
      const { id, ...updateData } = moodData;
      
      await updateMood(editingMood.id, updateData);
      setIsEditDialogOpen(false);
      setEditingMood(null);
    } catch (error) {
      console.error('Error updating mood:', error);
      // Error will be handled by the form validation or shown in console
    }
  };

  const handleDeleteConfirm = async () => {
    if (!editingMood) return;
    await deleteMood(editingMood.id);
    setIsDeleteDialogOpen(false);
    setEditingMood(null);
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
    setEditingMood(null);
  };
  return (
    <Box>
      {/* Section header with Add button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600, 
          color: theme.palette.warning.main,
          fontSize: '0.875rem' // Smaller header to match MenuBar style
        }}>
          Moods
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ 
            color: theme.palette.warning.main,
            '&:hover': { backgroundColor: theme.palette.warning.main + '10' }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>      {/* Moods grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0.5, mb: 2 }}>
        {moods.map(m => (
          <Box
            key={m.id}
            onClick={() => setSelectedMood(m)}
            onContextMenu={(e) => handleContextMenu(e, m)}            sx={{
              p: 0.75,
              cursor: 'pointer',
              borderRadius: 1,
              border: `2px solid ${theme.palette.warning.main}`,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selectedMood?.id === m.id 
                ? theme.palette.warning.light + '40'  // Selected: light orange
                : 'transparent',  // Not selected: transparent
              transition: 'background 0.2s, border 0.2s',
              fontSize: '0.85rem',
              '&:hover': {
                background: theme.palette.warning.light + '20',
              },
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                fontSize: '0.75rem', // Match original MenuBar mood name size
                lineHeight: 1.1,
                color: theme.palette.warning.main,
                textAlign: 'center'
              }}
            >
              {m.mood}
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
        }
        PaperProps={{
          sx: {
            '& .MuiMenuItem-root': {
              fontSize: '0.75rem' // Match MenuBar font sizes
            }
          }
        }}
      >        <MenuItem onClick={() => contextMenu && handleEdit(contextMenu.mood)}>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => contextMenu && handleDelete(contextMenu.mood)}
          sx={{ color: '#d32f2f' }} // Red color for delete action
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <SimpleDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreateSave}
        onCancel={handleCreateCancel}
        title="Create New Mood"
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
        title="Edit Mood"
        saveLabel="Update"
      >        <SimpleForm
          key={`edit-${editingMood?.id || 'none'}`} // Force re-render when editing different mood
          ref={editFormRef}
          fields={formFields}
          initialData={editingMood ? {
            moodJson: JSON.stringify({
              mood: editingMood.mood,
              ...(editingMood.description && { description: editingMood.description })
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
        title="Delete Mood"
        message={`Are you sure you want to delete mood "${editingMood?.mood}"? This action cannot be undone.`}
      />
    </Box>
  );
};

export default MoodsCrud;
