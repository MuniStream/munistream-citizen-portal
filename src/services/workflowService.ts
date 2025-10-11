import type { WorkflowDefinition, WorkflowCategory, WorkflowSearchParams } from '../types/workflow';
export type { WorkflowDefinition } from '../types/workflow';
import { addLocaleToParams } from '../utils/locale';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

class WorkflowService {
  // Get all public workflows (no auth required)
  async getPublicWorkflows(params?: WorkflowSearchParams): Promise<WorkflowDefinition[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.append('query', params.query);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.sortBy) searchParams.append('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.append('sort_order', params.sortOrder);
    
    addLocaleToParams(searchParams);

    const response = await fetch(`${API_BASE_URL}/public/workflows?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }

    const data = await response.json();
    return data.workflows || [];
  }

  // Get workflow by ID (public)
  async getWorkflowById(id: string): Promise<WorkflowDefinition> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);
    
    const response = await fetch(`${API_BASE_URL}/public/workflows/${id}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow details');
    }

    return response.json();
  }

  // Get workflow categories (public)
  async getWorkflowCategories(): Promise<WorkflowCategory[]> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);
    
    const response = await fetch(`${API_BASE_URL}/public/workflows/categories?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow categories');
    }

    const data = await response.json();
    return data.categories || [];
  }

  // Get featured/popular workflows (public)
  async getFeaturedWorkflows(): Promise<WorkflowDefinition[]> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);
    
    const response = await fetch(`${API_BASE_URL}/public/workflows/featured?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch featured workflows');
    }

    const data = await response.json();
    return data.featured || [];
  }

  // Start a new workflow instance (requires authentication)
  async startWorkflow(workflowId: string, initialData?: Record<string, any>): Promise<WorkflowInstance> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);
    
    // Get Keycloak token
    const keycloakService = (await import('./keycloak')).default;
    const token = keycloakService.getToken();
    console.log('[WorkflowService] Token available:', !!token);
    if (!token) {
      throw new Error('Authentication required to start workflows. Please login first.');
    }
    
    const response = await fetch(`${API_BASE_URL}/public/workflows/${workflowId}/start?${searchParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(initialData || {}),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, Keycloak will handle re-authentication
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start workflow');
    }

    return response.json();
  }

  // Track workflow instance progress - requires authentication
  async trackWorkflowInstance(instanceId: string): Promise<WorkflowInstanceProgress> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);

    // Get authentication token
    const token = authService.getToken();
    if (!token) {
      throw new Error('Authentication required to track workflow');
    }

    const response = await fetch(`${API_BASE_URL}/public/track/${instanceId}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, Keycloak will handle re-authentication
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to track workflow instance');
    }

    return response.json();
  }

  // Submit citizen data for a workflow step (requires authentication)
  async submitCitizenData(instanceId: string, formData: FormData): Promise<DataSubmissionResponse> {
    const searchParams = new URLSearchParams();
    addLocaleToParams(searchParams);
    
    // Get valid token
    const keycloakService = (await import('./keycloak')).default;
    const token = keycloakService.getToken();
    if (!token) {
      throw new Error('Authentication required to submit data. Please login first.');
    }
    
    const response = await fetch(`${API_BASE_URL}/public/instances/${instanceId}/submit-data?${searchParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Note: Don't set Content-Type when sending FormData, browser will set it with boundary
      },
      body: formData, // FormData handles multipart/form-data automatically
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, Keycloak will handle re-authentication
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit data');
    }

    return response.json();
  }

  // Get customer's workflow instances (requires authentication)
  async getCustomerWorkflows(): Promise<CustomerWorkflowsResponse> {
    const keycloakService = (await import('./keycloak')).default;
    const token = keycloakService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/public/auth/my-workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch customer workflows');
    }

    return response.json();
  }
}

// Types for workflow instances
export interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  customer_tracking_id: string;
  is_authenticated: boolean;
  status: string;
  created_at: string;
  next_step?: string;
  tracking_url: string;
  message: string;
}

export interface WorkflowInstanceProgress {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  progress_percentage: number;
  current_step?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  total_steps: number;
  completed_steps: number;
  step_progress: StepProgress[];
  requires_input: boolean;
  input_form: InputForm;
  estimated_completion?: string;
  message: string;
}

export interface StepProgress {
  step_id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  requires_citizen_input?: boolean;
  input_form?: InputForm;
}

export interface InputForm {
  title?: string;
  description?: string;
  fields?: FormField[];
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
}

export interface DataSubmissionResponse {
  success: boolean;
  message: string;
  next_action: string;
  locale: string;
}

export interface CustomerWorkflowsResponse {
  customer_id: string;
  total_workflows: number;
  workflows: CustomerWorkflowInstance[];
}

export interface CustomerWorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  current_step?: string;
  tracking_url: string;
}

export const workflowService = new WorkflowService();