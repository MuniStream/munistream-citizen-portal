import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  helpText?: string;
}

export interface DataCollectionFormProps {
  title: string;
  description: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export const DataCollectionForm: React.FC<DataCollectionFormProps> = ({
  title,
  description,
  fields,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Submit Information'
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleFileUpload = (fieldId: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
      setFormData(prev => ({ ...prev, [fieldId]: file.name }));
      
      // Clear error
      if (errors[fieldId]) {
        setErrors(prev => ({ ...prev, [fieldId]: '' }));
      }
    }
  };

  const validateField = (field: FormField, value: any): string => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      const { pattern, minLength, maxLength, min, max } = field.validation;
      
      if (pattern && !new RegExp(pattern).test(value)) {
        return `${field.label} format is invalid`;
      }
      
      if (minLength && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }
      
      if (maxLength && value.length > maxLength) {
        return `${field.label} must be no more than ${maxLength} characters`;
      }
      
      if (field.type === 'number') {
        const numValue = parseFloat(value);
        if (min !== undefined && numValue < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return `${field.label} must be no more than ${max}`;
        }
      }
    }

    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare submission data including files
    const submissionData = {
      ...formData,
      _files: uploadedFiles
    };

    onSubmit(submissionData);
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      disabled: isSubmitting
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={4}
            className="form-input"
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="form-input"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'file':
        return (
          <div className="file-upload-container">
            <input
              {...commonProps}
              type="file"
              onChange={(e) => handleFileUpload(field.id, e.target.files)}
              className="file-input"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <div className="file-upload-display">
              {uploadedFiles[field.id] ? (
                <div className="uploaded-file">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{uploadedFiles[field.id].name}</span>
                  <span className="file-size">
                    ({Math.round(uploadedFiles[field.id].size / 1024)} KB)
                  </span>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">⬆️</span>
                  <span>Click to upload {field.label}</span>
                  <small>PDF, JPG, PNG, DOC (max 10MB)</small>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="form-input"
          />
        );
    }
  };

  return (
    <div className="data-collection-form">
      <div className="form-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {fields.map(field => (
          <div key={field.id} className="form-group">
            <label htmlFor={field.id} className="form-label">
              {field.label}
              {field.required && <span className="required-indicator">*</span>}
            </label>
            
            {renderField(field)}
            
            {field.helpText && (
              <small className="help-text">{field.helpText}</small>
            )}
            
            {errors[field.id] && (
              <span className="field-error">{errors[field.id]}</span>
            )}
          </div>
        ))}

        <div className="form-actions">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
};