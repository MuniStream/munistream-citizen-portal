/**
 * Entity Field Type Detection Utility
 * Analyzes field values to determine the appropriate visualizer
 */

export const FieldType = {
  PDF: 'pdf',
  IMAGE: 'image',
  URL: 'url',
  EMAIL: 'email',
  PHONE: 'phone',
  JSON: 'json',
  SIGNATURE: 'signature',
  QR_DATA: 'qr_data',
  ADDRESS: 'address',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  CURRENCY: 'currency',
  DOCUMENT_REFERENCE: 'document_reference',
  TEXT: 'text',
  UNKNOWN: 'unknown'
} as const

export type FieldType = typeof FieldType[keyof typeof FieldType];

export interface DetectedField {
  type: FieldType;
  value: any;
  metadata?: {
    mimeType?: string;
    isFile?: boolean;
    fileExtension?: string;
    confidence?: number;
  };
}

// Patterns for detection
const PATTERNS = {
  url: /^(https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/,
  signature: /^(0x)?[a-fA-F0-9]{64,}$/,  // Hex signature/hash
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  iso_date: /^\d{4}-\d{2}-\d{2}$/,
  iso_datetime: /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/,
  currency: /^[$€£¥₹]\s*[\d,]+\.?\d*$/,
  document_id: /^(doc_|document_|file_)/i,
  address: /\b\d+\s+[\w\s]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|pl)\b/i,
};

// File extensions mapped to types
const FILE_EXTENSIONS: Record<string, FieldType> = {
  // Images
  jpg: FieldType.IMAGE,
  jpeg: FieldType.IMAGE,
  png: FieldType.IMAGE,
  gif: FieldType.IMAGE,
  webp: FieldType.IMAGE,
  svg: FieldType.IMAGE,
  bmp: FieldType.IMAGE,

  // Documents
  pdf: FieldType.PDF,

  // Data
  json: FieldType.JSON,
};

/**
 * Detects the field type based on the value and context
 */
export function detectFieldType(value: any, fieldName?: string): DetectedField {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { type: FieldType.TEXT, value: value || '' };
  }

  // Boolean
  if (typeof value === 'boolean') {
    return { type: FieldType.BOOLEAN, value };
  }

  // Number
  if (typeof value === 'number') {
    return { type: FieldType.NUMBER, value };
  }

  // Object/Array - treat as JSON
  if (typeof value === 'object') {
    return {
      type: FieldType.JSON,
      value,
      metadata: { confidence: 1 }
    };
  }

  // String analysis
  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    // Empty string
    if (!trimmedValue) {
      return { type: FieldType.TEXT, value: '' };
    }

    // Check for URLs with file extensions
    if (PATTERNS.url.test(trimmedValue)) {
      try {
        const url = new URL(trimmedValue);
        const pathname = url.pathname.toLowerCase();
        const extension = pathname.split('.').pop();

        if (extension && FILE_EXTENSIONS[extension]) {
          return {
            type: FILE_EXTENSIONS[extension],
            value: trimmedValue,
            metadata: {
              isFile: true,
              fileExtension: extension,
              mimeType: getMimeType(extension)
            }
          };
        }

        return {
          type: FieldType.URL,
          value: trimmedValue,
          metadata: { confidence: 0.95 }
        };
      } catch {
        // Not a valid URL, continue with other checks
      }
    }

    // Check for document references (based on field name or value pattern)
    if (fieldName?.includes('document') || fieldName?.includes('file') || PATTERNS.document_id.test(trimmedValue)) {
      return {
        type: FieldType.DOCUMENT_REFERENCE,
        value: trimmedValue,
        metadata: { confidence: 0.8 }
      };
    }

    // Email
    if (PATTERNS.email.test(trimmedValue)) {
      return {
        type: FieldType.EMAIL,
        value: trimmedValue,
        metadata: { confidence: 0.95 }
      };
    }

    // Phone
    if (PATTERNS.phone.test(trimmedValue)) {
      return {
        type: FieldType.PHONE,
        value: trimmedValue,
        metadata: { confidence: 0.85 }
      };
    }

    // Signature/Hash
    if (PATTERNS.signature.test(trimmedValue) || fieldName?.includes('signature') || fieldName?.includes('hash')) {
      return {
        type: FieldType.SIGNATURE,
        value: trimmedValue,
        metadata: { confidence: 0.9 }
      };
    }

    // Date/DateTime
    if (PATTERNS.iso_datetime.test(trimmedValue)) {
      return {
        type: FieldType.DATETIME,
        value: trimmedValue,
        metadata: { confidence: 0.95 }
      };
    }

    if (PATTERNS.iso_date.test(trimmedValue)) {
      return {
        type: FieldType.DATE,
        value: trimmedValue,
        metadata: { confidence: 0.95 }
      };
    }

    // Currency
    if (PATTERNS.currency.test(trimmedValue)) {
      return {
        type: FieldType.CURRENCY,
        value: trimmedValue,
        metadata: { confidence: 0.85 }
      };
    }

    // Address
    if (PATTERNS.address.test(trimmedValue) || fieldName?.includes('address')) {
      return {
        type: FieldType.ADDRESS,
        value: trimmedValue,
        metadata: { confidence: 0.7 }
      };
    }

    // QR Data (if field name suggests it)
    if (fieldName?.includes('qr') || fieldName?.includes('barcode')) {
      return {
        type: FieldType.QR_DATA,
        value: trimmedValue,
        metadata: { confidence: 0.8 }
      };
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(trimmedValue);
      if (parsed && typeof parsed === 'object') {
        return {
          type: FieldType.JSON,
          value: parsed,
          metadata: { confidence: 0.9 }
        };
      }
    } catch {
      // Not JSON, continue
    }
  }

  // Default to text
  return { type: FieldType.TEXT, value: String(value) };
}

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',

    // Documents
    pdf: 'application/pdf',

    // Data
    json: 'application/json',

    // Text
    txt: 'text/plain',
    csv: 'text/csv',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Batch detect field types for an object
 */
export function detectFieldTypes(data: Record<string, any>): Record<string, DetectedField> {
  const result: Record<string, DetectedField> = {};

  for (const [key, value] of Object.entries(data)) {
    result[key] = detectFieldType(value, key);
  }

  return result;
}

/**
 * Check if a field should be visualized (vs just displayed as text)
 */
export function shouldVisualize(field: DetectedField): boolean {
  const visualizableTypes: string[] = [
    FieldType.PDF,
    FieldType.IMAGE,
    FieldType.URL,
    FieldType.JSON,
    FieldType.SIGNATURE,
    FieldType.QR_DATA,
    FieldType.ADDRESS,
    FieldType.DOCUMENT_REFERENCE
  ];

  return visualizableTypes.includes(field.type);
}