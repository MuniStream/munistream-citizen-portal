import React, { useState, useCallback } from 'react';
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
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea' | 'file' | 'camera' | 'entity_select' | 'entity_multi_select' | 'array';
  required: boolean;
  placeholder?: string;
  options?: string[] | EntityOption[];
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
  // Entity selection specific fields
  entity_type?: string;
  min_count?: number;
  max_count?: number;
  description?: string;
  // Camera specific fields
  capture?: 'user' | 'environment';
  instructions?: string;
  // File specific fields
  accept?: string;
  multiple?: boolean;
  // Array specific fields (repeating sub-form)
  item_fields?: FormField[];
  min_items?: number;
  max_items?: number;
  item_label_template?: string;
  add_button_label?: string;
  sum_field?: string;
  sum_equals?: number;
  // Conditional visibility (only meaningful inside item_fields; refers to
  // sibling fields in the same array item)
  show_if?: { field: string; value: string | string[] };
}

export interface EntityOption {
  value: string;
  label: string;
  entity_data: {
    entity_id: string;
    entity_type: string;
    name: string;
    data: Record<string, any>;
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
  initialValues?: Record<string, any>;
}

export const DataCollectionForm: React.FC<DataCollectionFormProps> = ({
  title,
  description,
  fields,
  sections,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Submit Information',
  initialValues
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => ({ ...(initialValues || {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const [, setAutoCompleteLoading] = useState<Record<string, boolean>>({});
  
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

      setAutoCompleteLoading((prev: any) => ({ ...prev, [fieldId]: true }));

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
        setAutoCompleteLoading((prev: any) => ({ ...prev, [fieldId]: false }));
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

  const handleCameraCapture = async (fieldId: string, facingMode: string = 'user') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // Create overlay div for camera
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      // Style video
      video.style.cssText = `
        max-width: 90%;
        max-height: 70%;
        border: 2px solid #007bff;
        border-radius: 8px;
      `;

      // Create capture button
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capturar Foto';
      captureBtn.style.cssText = `
        margin-top: 20px;
        padding: 12px 24px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      `;

      // Create cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.cssText = `
        margin: 10px;
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;

      overlay.appendChild(video);
      overlay.appendChild(captureBtn);
      overlay.appendChild(cancelBtn);
      document.body.appendChild(overlay);

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(overlay);
      };

      captureBtn.onclick = () => {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        // Convert to blob and create file
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().getTime();
            const filename = `camera_capture_${fieldId}_${timestamp}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });

            // Create data URL for preview
            const reader = new FileReader();
            reader.onload = () => {
              const fileWithDataURL = Object.assign(file, { dataURL: reader.result });
              setUploadedFiles(prev => ({ ...prev, [fieldId]: fileWithDataURL }));
              setFormData(prev => ({ ...prev, [fieldId]: filename }));

              // Clear error
              if (errors[fieldId]) {
                setErrors(prev => ({ ...prev, [fieldId]: '' }));
              }
            };
            reader.readAsDataURL(file);
          }
          cleanup();
        }, 'image/jpeg', 0.8);
      };

      cancelBtn.onclick = cleanup;

    } catch (error) {
      console.error('Camera access error:', error);
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    }
  };

  const getItems = (arrayFieldId: string): Record<string, any>[] => {
    const current = formData[arrayFieldId];
    return Array.isArray(current) ? current : [];
  };

  const setItems = (arrayFieldId: string, items: Record<string, any>[]) => {
    setFormData(prev => ({ ...prev, [arrayFieldId]: items }));
    if (errors[arrayFieldId]) {
      setErrors(prev => ({ ...prev, [arrayFieldId]: '' }));
    }
  };

  const handleItemChange = (arrayFieldId: string, index: number, itemFieldName: string, value: any) => {
    const items = getItems(arrayFieldId);
    const next = items.map((item, i) => i === index ? { ...item, [itemFieldName]: value } : item);
    setItems(arrayFieldId, next);
  };

  const handleItemFileChange = (arrayFieldId: string, index: number, itemFieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    handleItemChange(arrayFieldId, index, itemFieldName, fileArray);
  };

  const emptyItem = (itemFields: FormField[]): Record<string, any> => {
    const item: Record<string, any> = {};
    itemFields.forEach(f => {
      item[f.name] = f.type === 'file' ? [] : '';
    });
    return item;
  };

  const addItem = (arrayFieldId: string, itemFields: FormField[], maxItems?: number) => {
    const items = getItems(arrayFieldId);
    if (maxItems !== undefined && items.length >= maxItems) return;
    setItems(arrayFieldId, [...items, emptyItem(itemFields)]);
  };

  const removeItem = (arrayFieldId: string, index: number, minItems: number) => {
    const items = getItems(arrayFieldId);
    if (items.length <= minItems) return;
    setItems(arrayFieldId, items.filter((_, i) => i !== index));
  };

  const isItemFieldVisible = (itemField: FormField, item: Record<string, any>): boolean => {
    if (!itemField.show_if) return true;
    const ref = item?.[itemField.show_if.field];
    const expected = itemField.show_if.value;
    return Array.isArray(expected) ? expected.includes(ref) : ref === expected;
  };

  const renderItemField = (
    arrayFieldId: string,
    index: number,
    itemField: FormField,
    itemValue: any
  ): React.ReactElement => {
    const inputId = `${arrayFieldId}_${index}_${itemField.name}`;
    const commonProps = {
      id: inputId,
      name: inputId,
      required: itemField.required,
      disabled: isSubmitting
    };

    switch (itemField.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={itemField.placeholder}
            value={itemValue ?? ''}
            onChange={(e) => handleItemChange(arrayFieldId, index, itemField.name, e.target.value)}
            rows={3}
            className="form-input"
          />
        );
      case 'select':
        return (
          <select
            {...commonProps}
            value={itemValue ?? ''}
            onChange={(e) => handleItemChange(arrayFieldId, index, itemField.name, e.target.value)}
            className="form-input"
          >
            <option value="">{itemField.placeholder || `Seleccione ${itemField.label}`}</option>
            {(itemField.options as any[] | undefined)?.map((opt: any) => {
              const isObj = opt && typeof opt === 'object' && 'value' in opt;
              const v = isObj ? opt.value : opt;
              const l = isObj ? (opt.label ?? opt.value) : opt;
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
        );
      case 'file': {
        const files: File[] = Array.isArray(itemValue) ? itemValue : [];
        return (
          <div className="file-upload-container">
            <input
              {...commonProps}
              type="file"
              onChange={(e) => handleItemFileChange(arrayFieldId, index, itemField.name, e.target.files)}
              className="file-input"
              accept={itemField.accept || '.pdf,.jpg,.jpeg,.png'}
              multiple={itemField.multiple}
            />
            <div className="file-upload-display">
              {files.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {files.map((f, i) => (
                    <li key={i}>
                      <span className="file-icon">📄</span>{' '}
                      <span className="file-name">{f.name}</span>{' '}
                      <span className="file-size">({Math.round(f.size / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">⬆️</span>
                  <span>Haz clic para subir {itemField.label}</span>
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return (
          <input
            {...commonProps}
            type={itemField.type === 'number' ? 'number' : itemField.type}
            placeholder={itemField.placeholder}
            value={itemValue ?? ''}
            step={itemField.type === 'number' ? 'any' : undefined}
            min={itemField.validation?.min}
            max={itemField.validation?.max}
            onChange={(e) => {
              const raw = e.target.value;
              const v = itemField.type === 'number' && raw !== '' ? parseFloat(raw) : raw;
              handleItemChange(arrayFieldId, index, itemField.name, v);
            }}
            className="form-input"
          />
        );
    }
  };

  const validateField = (field: FormField, value: any): string => {
    if (field.type === 'array') {
      const items: Record<string, any>[] = Array.isArray(value) ? value : [];
      const minItems = field.min_items ?? (field.required ? 1 : 0);
      const maxItems = field.max_items;
      if (items.length < minItems) {
        return `${field.label}: se requieren al menos ${minItems}`;
      }
      if (maxItems !== undefined && items.length > maxItems) {
        return `${field.label}: máximo ${maxItems}`;
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        for (const itemField of field.item_fields || []) {
          if (!isItemFieldVisible(itemField, item)) continue;
          const v = item[itemField.name];
          const isEmpty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
          if (itemField.required && isEmpty) {
            return `${field.label} ${i + 1}: ${itemField.label} es requerido`;
          }
          if (!isEmpty && itemField.validation?.pattern && typeof v === 'string' && !new RegExp(itemField.validation.pattern).test(v)) {
            return `${field.label} ${i + 1}: ${itemField.label} tiene formato inválido`;
          }
          if (itemField.type === 'number' && !isEmpty) {
            const n = Number(v);
            if (itemField.validation?.min !== undefined && n < itemField.validation.min) {
              return `${field.label} ${i + 1}: ${itemField.label} debe ser ≥ ${itemField.validation.min}`;
            }
            if (itemField.validation?.max !== undefined && n > itemField.validation.max) {
              return `${field.label} ${i + 1}: ${itemField.label} debe ser ≤ ${itemField.validation.max}`;
            }
          }
        }
      }
      if (field.sum_field && field.sum_equals !== undefined) {
        const total = items.reduce((acc, item) => acc + (Number(item[field.sum_field!]) || 0), 0);
        if (Math.abs(total - field.sum_equals) > 0.01) {
          return `${field.label}: la suma de ${field.sum_field} debe ser ${field.sum_equals} (actual: ${total.toFixed(2)})`;
        }
      }
      return '';
    }

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

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const serializeFile = async (file: File) => ({
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
    base64: await fileToBase64(file)
  });

  const serializeArrayFields = async (data: Record<string, any>): Promise<{ data: Record<string, any>; hasArrayFiles: boolean }> => {
    let hasArrayFiles = false;
    const out: Record<string, any> = { ...data };
    for (const field of allFields) {
      if (field.type !== 'array') continue;
      const items: Record<string, any>[] = Array.isArray(out[field.id]) ? out[field.id] : [];
      const nextItems: Record<string, any>[] = [];
      for (const item of items) {
        const nextItem: Record<string, any> = { ...item };
        for (const itemField of field.item_fields || []) {
          if (itemField.type !== 'file') continue;
          const files: File[] = Array.isArray(item[itemField.name]) ? item[itemField.name] : [];
          if (files.length === 0) continue;
          hasArrayFiles = true;
          nextItem[itemField.name] = await Promise.all(files.map(serializeFile));
        }
        nextItems.push(nextItem);
      }
      out[field.id] = nextItems;
    }
    return { data: out, hasArrayFiles };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    try {
      const { data: serialized, hasArrayFiles } = await serializeArrayFields(formData);
      const submissionData: Record<string, any> = { ...serialized };

      if (hasArrayFiles) {
        // Base64-serialized files inside arrays require JSON transport.
        const extraFiles: Record<string, any> = {};
        for (const [key, file] of Object.entries(uploadedFiles)) {
          if (file instanceof File) {
            extraFiles[key] = await serializeFile(file);
          }
        }
        Object.assign(submissionData, extraFiles);
        submissionData._use_json = true;
      } else {
        submissionData._files = uploadedFiles;
      }

      onSubmit(submissionData);
    } catch (err) {
      console.error('Form serialization failed', err);
      setErrors(prev => ({ ...prev, _form: 'No se pudo preparar el envío. Intenta de nuevo.' }));
    }
  };

  // Entity Card Component
  const EntityCard: React.FC<{ entity: EntityOption; isSelected: boolean; onToggle: () => void }> = ({ entity, isSelected, onToggle }) => {
    const entityData = entity.entity_data;

    return (
      <div
        className={`entity-card ${isSelected ? 'selected' : ''}`}
        onClick={onToggle}
        style={{
          border: '2px solid',
          borderColor: isSelected ? '#2c5aa0' : '#e1e5e9',
          borderRadius: '8px',
          padding: '1rem',
          margin: '0.5rem 0',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#f8f9fa' : '#fff',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: '24px', marginTop: '2px' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // Handled by card click
              style={{
                pointerEvents: 'none',
                width: '18px',
                height: '18px',
                margin: 0
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 'bold',
              color: '#2c5aa0',
              marginBottom: '0.5rem',
              fontSize: '1rem'
            }}>
              {entityData.name}
            </div>
            <div style={{
              display: 'grid',
              gap: '0.25rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ color: '#666' }}>
                <strong>Tipo:</strong> {entityData.entity_type}
              </div>
              {entityData.data.document_type && (
                <div style={{ color: '#666' }}>
                  <strong>Documento:</strong> {entityData.data.document_type}
                </div>
              )}
              {entityData.data.upload_date && (
                <div style={{ color: '#888' }}>
                  <strong>Subido:</strong> {new Date(entityData.data.upload_date).toLocaleDateString('es-MX')}
                </div>
              )}
              {entityData.data.file_size && (
                <div style={{ color: '#888' }}>
                  <strong>Tamaño:</strong> {Math.round(entityData.data.file_size / 1024)} KB
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
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
      case 'entity_select':
      case 'entity_multi_select': {
        const entityOptions = field.options as EntityOption[] || [];
        const isMultiSelect = field.type === 'entity_multi_select';
        const currentValue = formData[field.id] || [];
        const selectedValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);

        const handleEntityToggle = (entityId: string) => {
          if (isMultiSelect) {
            const newValues = selectedValues.includes(entityId)
              ? selectedValues.filter(id => id !== entityId)
              : [...selectedValues, entityId];
            handleInputChange(field.id, newValues);
          } else {
            // For single select, send array with one element or empty array
            const newValues = selectedValues.includes(entityId) ? [] : [entityId];
            handleInputChange(field.id, newValues);
          }
        };

        return (
          <div className="entity-selector">
            {field.description && (
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                {field.description}
              </p>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {isMultiSelect ?
                  `Selected: ${selectedValues.length} / ${field.max_count || 'unlimited'}` :
                  `Selected: ${selectedValues.length > 0 ? '1' : '0'} / 1`
                }
                {field.min_count && field.min_count > 0 && (
                  <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>
                    (Minimum: {field.min_count})
                  </span>
                )}
              </span>
            </div>

            <div className="entity-options">
              {entityOptions.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px dashed #e1e5e9'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    No {field.entity_type} entities available
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    {field.min_count && field.min_count > 0
                      ? `You need to upload ${field.entity_type} documents first before you can select them.`
                      : `No ${field.entity_type} documents available. This is optional - you can skip it or upload documents if needed.`
                    }
                  </div>
                </div>
              ) : (
                entityOptions.map((entity) => (
                  <EntityCard
                    key={entity.value}
                    entity={entity}
                    isSelected={selectedValues.includes(entity.value)}
                    onToggle={() => handleEntityToggle(entity.value)}
                  />
                ))
              )}
            </div>
          </div>
        );
      }

      case 'array': {
        const itemFields = field.item_fields || [];
        const items = getItems(field.id);
        const minItems = field.min_items ?? 0;
        const maxItems = field.max_items;
        const canAdd = maxItems === undefined || items.length < maxItems;

        // Ensure at least min_items rows exist on first render
        if (items.length < Math.max(1, minItems)) {
          setTimeout(() => {
            const current = getItems(field.id);
            if (current.length < Math.max(1, minItems)) {
              const toAdd = Math.max(1, minItems) - current.length;
              setItems(field.id, [...current, ...Array.from({ length: toAdd }, () => emptyItem(itemFields))]);
            }
          }, 0);
        }

        const sumValue = field.sum_field
          ? items.reduce((acc, item) => acc + (Number(item[field.sum_field!]) || 0), 0)
          : null;
        const sumOk = sumValue === null || (field.sum_equals !== undefined && Math.abs(sumValue - field.sum_equals) < 0.01);

        return (
          <div className="array-field">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="array-field-item"
                style={{
                  border: '1px solid #e1e5e9',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  backgroundColor: '#fafbfc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong>
                    {(field.item_label_template || `${field.label} {{index}}`).replace('{{index}}', String(idx + 1))}
                  </strong>
                  <button
                    type="button"
                    onClick={() => removeItem(field.id, idx, minItems)}
                    disabled={items.length <= minItems || isSubmitting}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.75rem' }}
                  >
                    Eliminar
                  </button>
                </div>
                {itemFields.map(itemField => {
                  if (!isItemFieldVisible(itemField, item)) return null;
                  return (
                    <div key={itemField.name} className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label">
                        {itemField.label}
                        {itemField.required && <span className="required-indicator">*</span>}
                      </label>
                      {renderItemField(field.id, idx, itemField, item[itemField.name])}
                      {itemField.helpText && <small className="help-text">{itemField.helpText}</small>}
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => addItem(field.id, itemFields, maxItems)}
                disabled={!canAdd || isSubmitting}
                className="btn-secondary"
              >
                {field.add_button_label || `Agregar ${field.label}`}
              </button>
              {sumValue !== null && field.sum_equals !== undefined && (
                <span
                  style={{
                    fontWeight: 'bold',
                    color: sumOk ? '#28a745' : '#dc3545'
                  }}
                >
                  Suma {field.sum_field}: {sumValue.toFixed(2)} / {field.sum_equals}
                </span>
              )}
            </div>
          </div>
        );
      }

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
            {field.options?.map(option => {
              const isEntityOption = typeof option === 'object' && 'value' in option;
              const key = isEntityOption ? option.value : option;
              const value = isEntityOption ? option.value : option;
              const label = isEntityOption ? option.label : option;
              return (
                <option key={key} value={value}>{label}</option>
              );
            })}
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

      case 'camera':
        const facingMode = field.capture || 'user'; // 'user' for selfie, 'environment' for documents
        return (
          <div className="camera-capture-container">
            <div className="camera-preview" style={{
              width: '100%',
              maxWidth: '400px',
              aspectRatio: '4/3',
              backgroundColor: '#f8f9fa',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '1rem auto',
              position: 'relative'
            }}>
              {uploadedFiles[field.id] ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={(uploadedFiles[field.id] as any).dataURL}
                    alt={`Captured ${field.label}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px'
                    }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCameraCapture(field.id, facingMode)}
                      className="camera-retake-btn"
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Tomar nueva foto
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem',
                    color: '#6c757d'
                  }}>
                    {facingMode === 'user' ? '●' : '⬜'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCameraCapture(field.id, facingMode)}
                    className="camera-capture-btn"
                    style={{
                      padding: '1rem 2rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {facingMode === 'user' ? 'Tomar Selfie' : `Capturar ${field.label}`}
                  </button>
                  <div style={{
                    marginTop: '1rem',
                    fontSize: '0.9rem',
                    color: '#6c757d'
                  }}>
                    {facingMode === 'user'
                      ? 'Usa la cámara frontal de tu dispositivo'
                      : 'Usa la cámara trasera para documentos'
                    }
                  </div>
                  {field.instructions && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#6c757d',
                      fontStyle: 'italic'
                    }}>
                      {field.instructions}
                    </div>
                  )}
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