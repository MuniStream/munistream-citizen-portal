import api from './api';

export type ProfileFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select';

export interface ProfileFieldValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
}

export interface ProfileFieldOption {
  value: string;
  label: string;
}

export interface ProfileField {
  field_id: string;
  label: string;
  type: ProfileFieldType;
  required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  validation?: ProfileFieldValidation | null;
  options?: ProfileFieldOption[] | null;
  order: number;
  active: boolean;
}

export interface ProfileSchemaResponse {
  fields: ProfileField[];
}

export interface ProfileValues {
  data: Record<string, unknown>;
  updated_at?: string | null;
}

export const profileService = {
  async getSchema(): Promise<ProfileField[]> {
    const { data } = await api.get<ProfileSchemaResponse>('/me/profile/schema');
    return data.fields;
  },
  async getProfile(): Promise<ProfileValues> {
    const { data } = await api.get<ProfileValues>('/me/profile');
    return data;
  },
  async updateProfile(values: Record<string, unknown>): Promise<ProfileValues> {
    const { data } = await api.put<ProfileValues>('/me/profile', { data: values });
    return data;
  },
};

export default profileService;
