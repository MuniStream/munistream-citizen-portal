import api from './api';
import { mensajeDeError } from '../utils/errorMessage';

export interface VerificationResult {
  valid: boolean;
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  /**
   * `true` cuando el documento lo emitió la propia dependencia al completar un
   * trámite. Es lo que sostiene su autenticidad: `verified` (visto bueno de una
   * persona) solo aplica a los documentos que el ciudadano sube.
   */
  issued_by_authority?: boolean;
  verified: boolean;
  verification_date?: string;
  verified_by?: string;
  created_at?: string;
  valid_until?: string | null;
  authority: string;
  document_type: string;
  checksum_valid: boolean;
  checksum_provided: boolean;
  calculated_checksum?: string;
  validation_errors?: string[];
  error?: string;
}

class VerificationService {
  async verifyEntity(entityId: string, checksum?: string): Promise<VerificationResult> {
    try {
      const params = new URLSearchParams();
      if (checksum) {
        params.append('checksum', checksum);
      }

      const queryString = params.toString();
      const url = `/verify/${entityId}${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Entity verification failed:', error);

      // Return error result structure
      return {
        valid: false,
        entity_id: entityId,
        entity_type: 'unknown',
        name: 'Unknown',
        status: 'error',
        verified: false,
        authority: 'Unknown',
        document_type: 'Unknown',
        checksum_valid: false,
        checksum_provided: !!checksum,
        error: mensajeDeError(error, 'No fue posible completar la verificación.')
      };
    }
  }
}

export const verificationService = new VerificationService();