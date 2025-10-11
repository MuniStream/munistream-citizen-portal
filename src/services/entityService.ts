/**
 * Entity validation and auto-completion service
 * 
 * This service provides real-time validation and auto-completion
 * for entity-based forms, enabling dynamic field updates based
 * on user input.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface EntityValidationRequest {
  entity_type: string;
  data: Record<string, any>;
  validate_only?: boolean;
}

export interface EntityAutoCompleteRequest {
  entity_type: string;
  data: Record<string, any>;
  trigger_field: string;
}

export interface EntityValidationResponse {
  valid: boolean;
  validation_status: string;
  errors: string[];
  warnings: string[];
  auto_filled_fields: string[];
  auto_filled_data: Record<string, any>;
  suggestions: Record<string, any>;
}

export interface EntityRules {
  entity_type: string;
  required_fields: string[];
  validation_rules: Record<string, any>;
}

class EntityService {
  /**
   * Validate entity data and optionally get auto-completed fields
   */
  async validateEntity(request: EntityValidationRequest): Promise<EntityValidationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/entities/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Entity validation error:', error);
      throw error;
    }
  }

  /**
   * Auto-complete entity fields based on a trigger field
   */
  async autoCompleteEntity(request: EntityAutoCompleteRequest): Promise<EntityValidationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/entities/auto-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Entity auto-complete error:', error);
      throw error;
    }
  }

  /**
   * Get available entity types
   */
  async getEntityTypes(): Promise<{ entity_types: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/entities/types`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching entity types:', error);
      throw error;
    }
  }

  /**
   * Get validation rules for a specific entity type
   */
  async getEntityRules(entityType: string): Promise<EntityRules> {
    try {
      const response = await fetch(`${API_BASE_URL}/entities/rules/${entityType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching entity rules:', error);
      throw error;
    }
  }
}

export const entityService = new EntityService();