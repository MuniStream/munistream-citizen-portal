export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: string;
  requirements: string[];
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'action' | 'approval' | 'conditional' | 'integration';
  estimatedDuration?: string;
  requirements?: string[];
}

export interface WorkflowCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category_type?: string;
  is_featured?: boolean;
  workflowCount: number;
}

export interface WorkflowSearchParams {
  query?: string;
  category?: string;
  sortBy?: 'name' | 'duration' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}