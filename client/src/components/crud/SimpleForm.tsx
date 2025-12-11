import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { TextField, Box, Alert } from '@mui/material';

export interface FormField {
  name: string;
  label: string;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  validateJson?: boolean;
  validateYaml?: boolean;
}

export interface SimpleFormRef {
  submit: () => void;
  isValid: () => boolean;
}

interface SimpleFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  initialData?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  validateYaml?: (yamlString: string) => { isValid: boolean; error?: string };
}

const SimpleForm = forwardRef<SimpleFormRef, SimpleFormProps>(({
  fields,
  onSubmit,
  initialData = {},
  loading = false,
  error = null,
  validateYaml
}, ref) => {
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    setFormData(initialData);
    setErrors({});
  }, []); // run once on mount, remove initialData dep to prevent infinite update loop
  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && value.trim().length === 0) {
      return `${field.label} is required`;
    }

    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label} must be less than ${field.maxLength} characters`;
    }    // JSON validation
    if (field.validateJson && value.trim()) {
      try {
        JSON.parse(value);
      } catch (error) {
        return `Invalid JSON format`;
      }
    }

    // YAML validation
    if (field.validateYaml && value.trim() && validateYaml) {
      const yamlValidation = validateYaml(value);
      if (!yamlValidation.isValid) {
        return yamlValidation.error || 'Invalid YAML format';
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const value = formData[field.name] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };
  const isFormValid = () => {
    return fields.every(field => {
      const value = formData[field.name] || '';
      return validateField(field, value) === null;
    });
  };

  const submitForm = () => {
    if (validateForm()) {
      // Trim all string values before submitting
      const trimmedData = Object.keys(formData).reduce((acc, key) => {
        acc[key] = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
        return acc;
      }, {} as Record<string, string>);
      
      onSubmit(trimmedData);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    submit: submitForm,
    isValid: isFormValid
  }));

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {fields.map((field) => (        <TextField
          key={field.name}
          name={field.name}
          label={field.label}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          error={!!errors[field.name]}
          helperText={errors[field.name] || (field.maxLength ? `${(formData[field.name] || '').length}/${field.maxLength}` : '')}
          required={field.required}
          multiline={field.multiline}
          rows={field.rows || (field.multiline ? 3 : 1)}
          placeholder={field.placeholder}
          fullWidth
          margin="normal"
          disabled={loading}
          inputProps={{
            maxLength: field.maxLength
          }}sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.7rem', // Even smaller to match MenuBar compact style
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.7rem', // Match label size to input
            },
            '& .MuiFormHelperText-root': {
              fontSize: '0.6rem', // Very small for helper text
            },
          }}
        />
      ))}

      {/* Hidden submit button to enable form submission on Enter */}
      <button
        type="submit"
        style={{ display: 'none' }}        disabled={!isFormValid() || loading}
      />
    </Box>
  );
});

SimpleForm.displayName = 'SimpleForm';

export default SimpleForm;
