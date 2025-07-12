import type { WorkflowDefinition, WorkflowCategory, WorkflowSearchParams } from '../types/workflow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class WorkflowService {
  // Get all public workflows (no auth required)
  async getPublicWorkflows(params?: WorkflowSearchParams): Promise<WorkflowDefinition[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.append('query', params.query);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.sortBy) searchParams.append('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.append('sort_order', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/public/workflows?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }

    return response.json();
  }

  // Get workflow by ID (public)
  async getWorkflowById(id: string): Promise<WorkflowDefinition> {
    const response = await fetch(`${API_BASE_URL}/public/workflows/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/public/workflow-categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow categories');
    }

    return response.json();
  }

  // Get featured/popular workflows (public)
  async getFeaturedWorkflows(): Promise<WorkflowDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/public/workflows/featured`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch featured workflows');
    }

    return response.json();
  }
}

export const workflowService = new WorkflowService();