export interface EntityRequirement {
  instructions?: string;
  workflow_id?: string;
  display_name?: string;
  description?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface WorkflowDefinition {
  id: string;
  workflow_id?: string;  // Backend sends this instead of id sometimes
  name: string;
  description: string;
  category: string;
  workflow_type?: 'DOCUMENT' | 'PROCESS';  // Backend categorization
  estimatedDuration: string;
  estimated_duration?: string;  // Backend compatibility
  requirements: string[];
  entity_requirements?: EntityRequirement[];  // New field for entity requirements with workflow links
  steps: WorkflowStep[];
  isActive?: boolean;  // Legacy field
  available?: boolean;  // New field from backend
  cost?: number;  // Cost in currency units
  metadata?: {
    faqs?: FAQ[];
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
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