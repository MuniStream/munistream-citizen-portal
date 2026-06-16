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
  branches?: string[];  // Route names when the workflow forks (e.g. Persona Física / Moral)
  step_flow?: StepFlowSegment[];  // Ordered segments: common-step runs + interactive fork zones
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
  group?: string;
  branch?: string;  // Route this step is exclusive to; absent for common steps
}

// Slim step used inside step_flow (id/name/group only)
export interface FlowStep {
  id: string;
  name: string;
  group?: string;
}

export interface FlowRoute {
  label: string;
  steps: FlowStep[];
}

// A segment of the preview stepper: either a run of common steps, or a fork
// zone whose routes the citizen can expand.
export type StepFlowSegment =
  | { type: 'steps'; steps: FlowStep[] }
  | { type: 'fork'; routes: FlowRoute[] };

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