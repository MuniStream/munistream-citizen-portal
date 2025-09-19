import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { entityService } from '../services/entityService';

// Simple debounce function without external dependencies
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

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
  autoCompleteConfig?: {
    triggerOnLength?: number;
    triggerOnPattern?: string;
    triggerOnValue?: string;
  };
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  entityType?: string; // For entity-based auto-completion
}

export interface DataCollectionFormProps {
  title: string;
  description: string;
  fields?: FormField[];
  sections?: FormSection[];
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export const DataCollectionForm: React.FC<DataCollectionFormProps> = ({
  title,
  description,
  fields,
  sections,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Submit Information'
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [autoCompleteLoading, setAutoCompleteLoading] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  
  // Get all fields either from sections or direct fields prop
  const allFields = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.flatMap(section => section.fields);
    }
    return fields || [];
  }, [fields, sections]);

  // Debounced auto-complete function
  const debouncedAutoComplete = useCallback(
    debounce(async (fieldId: string, value: any, entityType?: string) => {
      if (!entityType || !value || value.toString().trim().length === 0) {
        return;
      }

      const section = sections?.find(s => 
        s.entityType === entityType && s.fields.some(f => f.id === fieldId)
      );
      
      if (!section) {
        return;
      }

      setAutoCompleteLoading(prev => ({ ...prev, [fieldId]: true }));

      try {
        // Get current data for this section
        const sectionData: Record<string, any> = {};
        section.fields.forEach(field => {
          if (formData[field.id] !== undefined) {
            sectionData[field.id] = formData[field.id];
          }
        });

        // Include the triggering field value
        sectionData[fieldId] = value;

        const response = await entityService.autoCompleteEntity({
          entity_type: entityType,
          data: sectionData,
          trigger_field: fieldId
        });

        if (response.auto_filled_data) {
          // Update form data with auto-filled values
          const newFormData: Record<string, any> = {};
          let hasChanges = false;

          Object.entries(response.auto_filled_data).forEach(([key, val]) => {
            // Only auto-fill if the field exists in this section and is currently empty
            if (section.fields.some(f => f.id === key) && 
                (formData[key] === undefined || formData[key] === '' || formData[key] === null)) {
              newFormData[key] = val;
              hasChanges = true;
            }
          });

          if (hasChanges) {
            setFormData(prev => ({ ...prev, ...newFormData }));
          }
        }

        // Update suggestions (like neighborhood options)
        if (response.suggestions) {
          setSuggestions(prev => ({ ...prev, ...response.suggestions }));
        }

      } catch (error) {
        console.error('Auto-complete error:', error);
        // Don't show errors for auto-complete failures
      } finally {
        setAutoCompleteLoading(prev => ({ ...prev, [fieldId]: false }));
      }
    }, 800), // 800ms delay
    [formData, sections, entityService]
  );

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }

    // Trigger auto-complete for entity-based sections
    if (sections) {
      const section = sections.find(s => 
        s.entityType && s.fields.some(f => f.id === fieldId)
      );
      
      if (section?.entityType) {
        const field = section.fields.find(f => f.id === fieldId);
        if (field && shouldTriggerAutoComplete(field, value)) {
          debouncedAutoComplete(fieldId, value, section.entityType);
        }
      }
    }
  };

  // Helper function to determine if a field should trigger auto-complete
  const shouldTriggerAutoComplete = (field: FormField, value: any): boolean => {
    if (!field.autoCompleteConfig || !value) {
      return false;
    }

    const config = field.autoCompleteConfig;
    const stringValue = value.toString();

    // Check length trigger
    if (config.triggerOnLength && stringValue.length === config.triggerOnLength) {
      return true;
    }

    // Check pattern trigger
    if (config.triggerOnPattern && new RegExp(config.triggerOnPattern).test(stringValue)) {
      return true;
    }

    // Check specific value trigger
    if (config.triggerOnValue && stringValue === config.triggerOnValue) {
      return true;
    }

    return false;
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
    allFields.forEach(field => {
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

    // Check if there are dynamic suggestions for this field
    const suggestionKey = `${field.id}_options`;
    const dynamicOptions = suggestions[suggestionKey];
    const hasDynamicOptions = Array.isArray(dynamicOptions) && dynamicOptions.length > 0;

    // If we have dynamic suggestions, render as select
    if (hasDynamicOptions) {
      return (
        <select
          {...commonProps}
          value={formData[field.id] || ''}
          onChange={(e) => handleInputChange(field.id, e.target.value)}
          className="form-input"
        >
          <option value="">Select {field.label}</option>
          {dynamicOptions.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

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
        {sections && sections.length > 0 ? (
          // Render sections with visual separation
          sections.map((section, sectionIndex) => (
            <section key={sectionIndex} className="form-section">
              <div className="section-header">
                <h4 className="section-title">{section.title}</h4>
                {section.description && (
                  <p className="section-description">{section.description}</p>
                )}
              </div>
              <div className="section-fields">
                {section.fields.map(field => (
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
              </div>
            </section>
          ))
        ) : (
          // Fallback to flat fields rendering
          allFields.map(field => (
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
          ))
        )}

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