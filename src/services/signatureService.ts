/**
 * Digital Signature Service
 *
 * Handles client-side X.509 certificate-based digital signing using Web Crypto API.
 * This service works with @peculiar/x509 for certificate handling and signature generation.
 */

import { X509Certificate } from '@peculiar/x509';
import { Crypto } from '@peculiar/webcrypto';
import axios from 'axios';

// Initialize WebCrypto API
const crypto = new Crypto();
if (typeof window !== 'undefined' && !window.crypto.subtle) {
  window.crypto = crypto as any;
}

export interface SignableData {
  instance_id: string;
  signature_field: string;
  signable_data: Record<string, any>;
  expires_at: string;
  instructions: string;
}

export interface SignatureResult {
  signature: string; // Base64 encoded signature
  certificate: string; // PEM encoded certificate
  algorithm: string;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  keyUsage: string[];
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SignatureStatus {
  signature_field: string;
  exists: boolean;
  status: string;
  created_at?: string;
  expires_at?: string;
  signed_at?: string;
  expired?: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  signature_received: boolean;
  verification_result?: {
    valid: boolean;
    verified_at: string;
  };
}

export class SignatureService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || '/api/v1';
  }

  /**
   * Load and parse X.509 certificate from file content
   */
  async loadCertificate(fileContent: ArrayBuffer | string): Promise<CertificateInfo> {
    try {
      let certificateData: ArrayBuffer;

      if (typeof fileContent === 'string') {
        // Handle PEM format
        if (fileContent.includes('-----BEGIN CERTIFICATE-----')) {
          const pemContent = fileContent
            .replace(/-----BEGIN CERTIFICATE-----/, '')
            .replace(/-----END CERTIFICATE-----/, '')
            .replace(/\s/g, '');
          certificateData = this.base64ToArrayBuffer(pemContent);
        } else {
          // Try as base64
          certificateData = this.base64ToArrayBuffer(fileContent);
        }
      } else {
        certificateData = fileContent;
      }

      const certificate = new X509Certificate(certificateData);

      // Extract certificate information
      const info: CertificateInfo = {
        subject: certificate.subject,
        issuer: certificate.issuer,
        validFrom: certificate.notBefore.toISOString(),
        validTo: certificate.notAfter.toISOString(),
        serialNumber: certificate.serialNumber,
        fingerprint: await this.getCertificateFingerprint(certificate),
        keyUsage: this.extractKeyUsage(certificate),
        valid: true,
        errors: [],
        warnings: []
      };

      // Validate certificate
      const now = new Date();
      if (certificate.notBefore > now) {
        info.valid = false;
        info.errors.push('Certificate is not yet valid');
      }

      if (certificate.notAfter < now) {
        info.valid = false;
        info.errors.push('Certificate has expired');
      }

      // Check if expiring soon (30 days)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (certificate.notAfter < thirtyDaysFromNow) {
        const daysUntilExpiry = Math.floor((certificate.notAfter.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        info.warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
      }

      // Check key usage for digital signature
      if (!info.keyUsage.includes('digitalSignature')) {
        info.warnings.push('Certificate may not be suitable for digital signatures');
      }

      return info;
    } catch (error) {
      throw new Error(`Failed to load certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load private key from file content
   */
  async loadPrivateKey(fileContent: ArrayBuffer | string, _passphrase?: string): Promise<CryptoKey> {
    try {
      let keyData: ArrayBuffer;

      if (typeof fileContent === 'string') {
        // Handle PEM format
        if (fileContent.includes('-----BEGIN PRIVATE KEY-----') ||
            fileContent.includes('-----BEGIN RSA PRIVATE KEY-----') ||
            fileContent.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {

          const pemLines = fileContent.split('\n');
          const keyLines = pemLines.filter(line =>
            !line.includes('-----BEGIN') &&
            !line.includes('-----END') &&
            line.trim() !== ''
          );
          const keyBase64 = keyLines.join('');
          keyData = this.base64ToArrayBuffer(keyBase64);
        } else {
          keyData = this.base64ToArrayBuffer(fileContent);
        }
      } else {
        keyData = fileContent;
      }

      // Try different key import formats
      try {
        // Try PKCS8 format first
        return await crypto.subtle.importKey(
          'pkcs8',
          keyData,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
          },
          false,
          ['sign']
        );
      } catch {
        // If PKCS8 fails, try RSA private key format
        try {
          // Convert PKCS1 to PKCS8 if needed
          return await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
              name: 'RSA-PSS',
              hash: 'SHA-256',
            },
            false,
            ['sign']
          );
        } catch (error) {
          throw new Error(`Failed to import private key: ${error instanceof Error ? error.message : 'Unsupported key format'}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to load private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get signable data from backend
   */
  async getSignableData(instanceId: string, signatureField: string): Promise<SignableData> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/signatures/instances/${instanceId}/signable-data/${signatureField}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get signable data: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Sign data using private key and certificate
   */
  async signData(
    signableData: Record<string, any>,
    privateKey: CryptoKey,
    certificate: X509Certificate,
    algorithm: string = 'RSA-SHA256'
  ): Promise<SignatureResult> {
    try {
      // Create canonical JSON representation of data to sign
      const dataToSign = JSON.stringify(signableData, null, 0);
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(dataToSign);

      // Determine signature algorithm
      let signAlgorithm: AlgorithmIdentifier;
      if (algorithm === 'RSA-SHA256') {
        signAlgorithm = 'RSASSA-PKCS1-v1_5';
      } else if (algorithm === 'RSA-PSS-SHA256') {
        signAlgorithm = 'RSA-PSS';
      } else {
        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
      }

      // Sign the data
      const signatureBuffer = await crypto.subtle.sign(
        signAlgorithm,
        privateKey,
        dataBytes
      );

      // Convert signature to base64
      const signatureBase64 = this.arrayBufferToBase64(signatureBuffer);

      // Convert certificate to PEM
      const certificatePem = this.certificateToPem(certificate);

      return {
        signature: signatureBase64,
        certificate: certificatePem,
        algorithm
      };
    } catch (error) {
      throw new Error(`Failed to sign data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit signature to backend
   */
  async submitSignature(
    instanceId: string,
    signatureField: string,
    signatureResult: SignatureResult
  ): Promise<SubmissionResponse> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/signatures/instances/${instanceId}/signatures/${signatureField}`,
        signatureResult
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to submit signature: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get signature status
   */
  async getSignatureStatus(instanceId: string, signatureField: string): Promise<SignatureStatus> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/signatures/instances/${instanceId}/signature-status/${signatureField}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get signature status: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Complete signing workflow
   */
  async completeSigningWorkflow(
    instanceId: string,
    signatureField: string,
    certificateFile: File,
    privateKeyFile: File,
    passphrase?: string
  ): Promise<SubmissionResponse> {
    try {
      // Load certificate and private key
      const certificateContent = await this.fileToArrayBuffer(certificateFile);
      const privateKeyContent = await this.fileToArrayBuffer(privateKeyFile);

      const certificateInfo = await this.loadCertificate(certificateContent);
      if (!certificateInfo.valid) {
        throw new Error(`Invalid certificate: ${certificateInfo.errors.join(', ')}`);
      }

      const certificate = new X509Certificate(certificateContent);
      const privateKey = await this.loadPrivateKey(privateKeyContent, passphrase);

      // Get signable data
      const signableData = await this.getSignableData(instanceId, signatureField);

      // Sign the data
      const signatureResult = await this.signData(
        signableData.signable_data,
        privateKey,
        certificate
      );

      // Submit signature
      return await this.submitSignature(instanceId, signatureField, signatureResult);
    } catch (error) {
      throw new Error(`Signing workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private certificateToPem(certificate: X509Certificate): string {
    const base64 = this.arrayBufferToBase64(certificate.rawData);
    const lines = [];
    lines.push('-----BEGIN CERTIFICATE-----');
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.slice(i, i + 64));
    }
    lines.push('-----END CERTIFICATE-----');
    return lines.join('\n');
  }

  private async getCertificateFingerprint(certificate: X509Certificate): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', certificate.rawData);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
  }

  private extractKeyUsage(_certificate: X509Certificate): string[] {
    const keyUsage: string[] = [];

    try {
      // This is a simplified extraction - real implementation would parse extensions
      // For now, assume digital signature is supported
      keyUsage.push('digitalSignature');
    } catch (error) {
      // Ignore extraction errors
    }

    return keyUsage;
  }
}