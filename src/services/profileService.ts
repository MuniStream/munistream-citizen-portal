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

export interface DomicilioFiscal {
  codigoPostal?: string;
  estado?: string;
  municipio?: string;
  colonia?: string;
  calle?: string;
  numExterior?: string;
  numInterior?: string;
}

export interface PersonaMoral {
  rfc?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  vigenciaCertificado?: string;
  correoEmpresa?: string;
  folioMercantil?: string;
  domicilioFiscal?: DomicilioFiscal;
}

export interface LlaveMxProfile {
  curp?: string | null;
  rfc?: string | null;
  tipo_persona?: string | null;
  personas_morales: PersonaMoral[];
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
  /**
   * Llave MX identity profile (persona física + associated personas morales),
   * synced into the backend Customer from the Keycloak token.
   */
  async getLlaveMxProfile(): Promise<LlaveMxProfile> {
    const { data } = await api.get<LlaveMxProfile>('/public/auth/me');
    return {
      curp: data.curp ?? null,
      rfc: data.rfc ?? null,
      tipo_persona: data.tipo_persona ?? null,
      personas_morales: Array.isArray(data.personas_morales) ? data.personas_morales : [],
    };
  },
};

export default profileService;
