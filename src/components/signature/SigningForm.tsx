import React, { useState, useCallback } from 'react';
import * as forge from 'node-forge';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Grid,
  LinearProgress,
  IconButton,
  FormHelperText,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedIcon,
  Assignment as DocumentIcon
} from '@mui/icons-material';
// workflowService no longer needed - parent component handles submission

interface SigningFormProps {
  instanceId: string;
  documentToSign: any;
  operatorConfig: {
    task_id: string;
    certificate_field: string;
    private_key_field: string;
    password_field: string;
    document_type?: string;
  };
  onSubmitSignature: (signatureData: DigitalSignatureData) => void;
  loading?: boolean;
  error?: string;
}

interface SignatureData {
  [key: string]: any;
  certificate_file?: File;
  private_key_file?: File;
}

interface DigitalSignatureData {
  digital_signature: string; // Base64-encoded signature
  digital_signature_certificate: string; // PEM-encoded certificate
  algorithm: string;
  timestamp: string;
  certificate_info?: any;
  [key: string]: any;
}

export const SigningForm: React.FC<SigningFormProps> = ({
  instanceId,
  documentToSign,
  operatorConfig,
  onSubmitSignature,
  loading = false,
  error
}) => {
  console.log('🔐 DigitalSignatureForm: Component rendered!');
  console.log('🔐 Props received:', { documentToSign, operatorConfig, loading, error });
  const [signatureData, setSignatureData] = useState<SignatureData>({
    [operatorConfig.certificate_field]: '',
    [operatorConfig.private_key_field]: '',
    [operatorConfig.password_field]: ''
  });

  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  // Helper functions for file parsing (supports both PEM and DER formats)
  const parseKeyFile = async (file: File): Promise<Uint8Array> => {
    console.log('🔧 Parsing key file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Read file as text first to check format
    const textContent = await file.text();
    console.log('🔧 File content preview:', textContent.substring(0, 200));

    // Check if it's a PEM file (contains -----BEGIN)
    if (textContent.includes('-----BEGIN')) {
      console.log('🔧 Detected PEM format');
      return pemToBinary(textContent);
    } else {
      console.log('🔧 Detected DER format (binary)');
      return derToBinary(file);
    }
  };

  // Handle PEM format (Base64 text)
  const pemToBinary = (pem: string): Uint8Array => {
    // Detect PEM type
    const isEncrypted = pem.includes('ENCRYPTED');
    const isRSAKey = pem.includes('RSA PRIVATE KEY');
    const isPKCS8 = pem.includes('PRIVATE KEY') && !pem.includes('RSA');

    console.log('🔧 PEM type detection:', { isEncrypted, isRSAKey, isPKCS8 });

    if (isEncrypted) {
      throw new Error('Las llaves privadas encriptadas no están soportadas. Use una llave sin contraseña.');
    }

    // Extract Base64 content
    const lines = pem.split('\n').map(line => line.trim());
    const base64Lines = lines.filter(line =>
      !line.includes('-----BEGIN') &&
      !line.includes('-----END') &&
      line.length > 0
    );

    const base64 = base64Lines.join('');
    console.log('🔧 Extracted Base64 length:', base64.length);

    try {
      const binaryString = atob(base64);
      return new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
    } catch (error) {
      console.error('❌ PEM Base64 decode failed:', error);
      throw new Error(`No se pudo decodificar PEM: ${error}`);
    }
  };

  // Handle DER format (binary)
  const derToBinary = async (file: File): Promise<Uint8Array> => {
    console.log('🔧 Reading DER binary file...');
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  // Decrypt FIEL encrypted private key (PKCS#8 with password) using node-forge
  const decryptFielKey = async (encryptedKeyData: Uint8Array, password: string): Promise<Uint8Array> => {
    console.log('🔓 Decrypting FIEL key with node-forge, size:', encryptedKeyData.length);

    try {
      // Convert Uint8Array to binary string for forge
      const binaryString = Array.from(encryptedKeyData).map(byte => String.fromCharCode(byte)).join('');

      console.log('🔍 Converting to DER format for forge processing');

      // Try to parse as encrypted PKCS#8 DER
      let privateKeyInfo;
      try {
        // Create ASN.1 object from DER
        const asn1 = forge.asn1.fromDer(binaryString);
        console.log('✅ Successfully parsed ASN.1 structure');

        // Try to get private key from encrypted PKCS#8
        privateKeyInfo = forge.pki.decryptPrivateKeyInfo(asn1, password);
        console.log('✅ Successfully decrypted PKCS#8 with password');
      } catch (pkcs8Error) {
        console.log('⚠️ Direct PKCS#8 decryption failed, trying PEM conversion:', pkcs8Error);

        // Convert DER to PEM format for forge
        const pemKey = forge.pki.privateKeyInfoToPem(forge.asn1.fromDer(binaryString));
        console.log('🔄 Converted DER to PEM for processing');

        // Try to decrypt as PEM
        const decryptedPem = forge.pki.decryptRsaPrivateKey(pemKey, password);
        if (!decryptedPem) {
          throw new Error('Contraseña incorrecta o formato de llave no soportado');
        }

        // Convert back to PKCS#8 info
        privateKeyInfo = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(decryptedPem));
      }

      // Convert decrypted private key info back to DER using proper forge API
      const derDecrypted = forge.asn1.toDer(privateKeyInfo).getBytes();
      console.log('🔧 DER conversion result type:', typeof derDecrypted, 'length:', derDecrypted.length);

      // Convert forge binary string back to Uint8Array
      const decryptedKeyData = new Uint8Array(derDecrypted.length);
      for (let i = 0; i < derDecrypted.length; i++) {
        decryptedKeyData[i] = derDecrypted.charCodeAt(i) & 0xFF; // Ensure byte value
      }

      console.log('✅ FIEL key successfully decrypted using node-forge');
      console.log('📊 Original DER size:', derDecrypted.length, 'Final array size:', decryptedKeyData.length);

      return decryptedKeyData;

    } catch (error) {
      console.error('❌ FIEL decryption failed:', error);

      let errorMessage = 'Error desconocido al desencriptar llave FIEL';
      if (error instanceof Error) {
        if (error.message.includes('Invalid password') || error.message.includes('Contraseña incorrecta')) {
          errorMessage = 'Contraseña incorrecta para la llave FIEL. Verifique la contraseña e intente nuevamente.';
        } else if (error.message.includes('Invalid key format') || error.message.includes('formato')) {
          errorMessage = 'Formato de llave FIEL no reconocido. Asegúrese de usar el archivo .key correcto del SAT.';
        } else {
          errorMessage = `Error al desencriptar llave FIEL: ${error.message}`;
        }
      }

      throw new Error(errorMessage);
    }
  };


  const parseCertificateBasicInfo = (_certPem: string) => {
    // Basic certificate info parsing - for display purposes
    // Real validation will be done on the backend
    try {
      return {
        subject: 'Parsed on backend',
        issuer: 'Parsed on backend',
        serialNumber: 'Parsed on backend',
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now as placeholder
      };
    } catch {
      return {
        subject: 'Unknown',
        issuer: 'Unknown',
        serialNumber: 'Unknown',
        notBefore: new Date().toISOString(),
        notAfter: new Date().toISOString()
      };
    }
  };

  // File upload handlers
  const handleCertificateUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.cer', '.crt', '.pem', '.der'];
      const isValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );

      if (!isValidExtension) {
        setValidationErrors(prev => ({
          ...prev,
          certificate: 'El archivo debe ser un certificado (.cer, .crt, .pem, .der)'
        }));
        return;
      }
      setCertificateFile(file);
      setSignatureData(prev => ({
        ...prev,
        [operatorConfig.certificate_field]: file.name,
        certificate_file: file
      }));
      setValidationErrors(prev => ({
        ...prev,
        certificate: ''
      }));
    }
  }, [operatorConfig.certificate_field]);

  const handlePrivateKeyUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.key', '.pem', '.p8', '.der'];
      const isValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );

      if (!isValidExtension) {
        setValidationErrors(prev => ({
          ...prev,
          privateKey: 'El archivo debe ser una llave privada (.key, .pem, .p8, .der)'
        }));
        return;
      }
      setPrivateKeyFile(file);
      setSignatureData(prev => ({
        ...prev,
        [operatorConfig.private_key_field]: file.name,
        private_key_file: file
      }));
      setValidationErrors(prev => ({
        ...prev,
        privateKey: ''
      }));
    }
  }, [operatorConfig.private_key_field]);

  const handlePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const password = event.target.value;
    setSignatureData(prev => ({
      ...prev,
      [operatorConfig.password_field]: password
    }));

    if (password.length > 0) {
      setValidationErrors(prev => ({
        ...prev,
        password: ''
      }));
    }
  }, [operatorConfig.password_field]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!certificateFile) {
      errors.certificate = 'Debe cargar su certificado digital (.cer)';
    }

    if (!privateKeyFile) {
      errors.privateKey = 'Debe cargar su llave privada (.key)';
    }

    if (!signatureData[operatorConfig.password_field]) {
      errors.password = 'Debe ingresar la contraseña de su llave privada';
    } else if (signatureData[operatorConfig.password_field].length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const performClientSideSign = async (): Promise<DigitalSignatureData> => {
    console.log('🔐 performClientSideSign: Starting signing process');

    if (!certificateFile || !privateKeyFile || !signatureData[operatorConfig.password_field]) {
      console.log('❌ Missing signing materials:', {
        certificateFile: !!certificateFile,
        privateKeyFile: !!privateKeyFile,
        password: !!signatureData[operatorConfig.password_field]
      });
      throw new Error('Missing required signing materials');
    }

    try {
      console.log('🔐 Reading certificate and private key files...');

      // Parse certificate file (supports both PEM and DER)
      const certData = await parseKeyFile(certificateFile);
      console.log('✅ Certificate file parsed, length:', certData.length);

      // Get certificate as base64 for safe MongoDB storage (convert from DER if needed)
      let certText: string;
      if (certificateFile.name.includes('FIEL') || certificateFile.name.includes('.cer')) {
        // For DER format certificates, convert to base64
        console.log('🔐 Converting DER certificate to base64 for safe storage');
        const base64Cert = btoa(String.fromCharCode(...certData));
        certText = `-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
      } else {
        // For PEM format, use as-is
        certText = await certificateFile.text();
      }

      // Import private key using browser's native Web Crypto API
      console.log('🔐 Importing private key...');
      let privateKey: CryptoKey;
      try {
        // Parse key file (supports both PEM and DER)
        const keyData = await parseKeyFile(privateKeyFile);
        console.log('✅ Key file parsed, length:', keyData.length);

        // FIEL keys require different handling based on whether they're encrypted
        const password = signatureData[operatorConfig.password_field];
        const isFieldKey = privateKeyFile.name.includes('FIEL') || privateKeyFile.name.includes('Claveprivada_FIEL');

        if (isFieldKey && password) {
          console.log('🇲🇽 Processing FIEL key with password');
          try {
            // FIEL keys are typically encrypted PKCS#8 DER format
            // We need to decrypt them using the password before importing
            const decryptedKeyData = await decryptFielKey(keyData, password);
            privateKey = await window.crypto.subtle.importKey(
              'pkcs8',
              decryptedKeyData,
              {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
              },
              false,
              ['sign']
            );
            console.log('✅ FIEL private key decrypted and imported successfully');
          } catch (fielError: any) {
            console.log('❌ FIEL key processing failed:', fielError);
            throw new Error(`Error procesando llave FIEL: ${fielError.message}`);
          }
        } else {
          // Try standard PKCS#8 import for non-FIEL keys
          try {
            privateKey = await window.crypto.subtle.importKey(
              'pkcs8',
              keyData,
              {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
              },
              false,
              ['sign']
            );
            console.log('✅ Private key imported as PKCS#8');
          } catch (pkcs8Error) {
            console.log('⚠️ PKCS#8 failed:', pkcs8Error);
            throw new Error('Formato de certificado no soportado. Use certificados PKCS#8 o FIEL mexicanos.');
          }
        }
      } catch (keyError: any) {
        console.error('❌ Key import failed:', keyError);
        throw new Error(`No se pudo importar la llave privada: ${keyError.message}`);
      }

      // Prepare signable data (same format as backend)
      console.log('🔐 Preparing signable data...');
      const signableData = {
        ...documentToSign,
        timestamp: new Date().toISOString(),
        signature_purpose: 'workflow_approval'
      };
      console.log('🔐 Signable data prepared:', signableData);

      // Create canonical JSON representation (same as backend)
      const dataToSign = JSON.stringify(signableData, Object.keys(signableData).sort());
      console.log('🔐 Canonical JSON to sign:', dataToSign);
      const dataBuffer = new TextEncoder().encode(dataToSign);
      console.log('🔐 Data buffer length:', dataBuffer.length);

      // Sign the data using browser's Web Crypto API
      console.log('🔐 Signing data with private key...');
      const signature = await window.crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        dataBuffer
      );
      console.log('✅ Data signed, signature length:', signature.byteLength);

      // Convert signature to base64
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
      console.log('✅ Signature converted to base64, length:', signatureBase64.length);

      // Parse basic certificate info (real validation on backend)
      const certificateInfo = parseCertificateBasicInfo(certText);
      console.log('🔐 Certificate info parsed:', certificateInfo);

      const result = {
        digital_signature: signatureBase64,
        digital_signature_certificate: certText,
        algorithm: 'RSA-SHA256',
        timestamp: new Date().toISOString(),
        certificate_info: certificateInfo
      };

      console.log('✅ Signing process completed, result keys:', Object.keys(result));
      return result;

    } catch (error: any) {
      console.error('❌ Client-side signing failed:', error);
      throw new Error(`Firma digital falló: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleSubmit = useCallback(async () => {
    console.log('🔐 DigitalSignatureForm: Starting signature submission process');
    console.log('🔐 Instance ID:', instanceId);
    console.log('🔐 Document to sign:', documentToSign);
    console.log('🔐 Operator config:', operatorConfig);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    setIsSigningInProgress(true);
    setValidationErrors({});

    try {
      console.log('🔐 Performing client-side signing...');
      // Perform client-side signing
      const digitalSignature = await performClientSideSign();

      console.log('✅ Client-side signing completed');
      console.log('🔐 Digital signature data to send:', digitalSignature);

      // Always use the callback - AdminWorkflowExecution handles the actual submission
      console.log('🔐 Sending signature data via onSubmitSignature callback');
      onSubmitSignature(digitalSignature);

      console.log('✅ Signature submission completed successfully');
    } catch (error: any) {
      console.error('❌ Digital signature submission failed:', error);
      console.error('❌ Error details:', error.stack);
      setValidationErrors({
        submission: error.message || 'Error al procesar la firma digital'
      });
    } finally {
      setIsSigningInProgress(false);
    }
  }, [signatureData, onSubmitSignature, certificateFile, privateKeyFile, operatorConfig.password_field, documentToSign]);

  const removeCertificate = () => {
    setCertificateFile(null);
    setSignatureData(prev => ({
      ...prev,
      [operatorConfig.certificate_field]: '',
      certificate_file: undefined
    }));
  };

  const removePrivateKey = () => {
    setPrivateKeyFile(null);
    setSignatureData(prev => ({
      ...prev,
      [operatorConfig.private_key_field]: '',
      private_key_file: undefined
    }));
  };

  const documentType = operatorConfig.document_type || 'documento';

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <form onSubmit={(e) => {
        e.preventDefault();
        console.log('🔐 Form onSubmit triggered!');
        handleSubmit();
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h5" component="h2" color="primary.main" fontWeight="bold">
            Firma Digital - {operatorConfig.task_id}
          </Typography>
        </Box>

      {/* Document preview */}
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DocumentIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6" color="info.main">
              {documentType} a firmar:
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" component="pre" sx={{
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflow: 'auto',
            p: 2,
            bgcolor: 'white',
            borderRadius: 1,
            border: 1,
            borderColor: 'grey.200'
          }}>
            {JSON.stringify(documentToSign, null, 2)}
          </Typography>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* Error display */}
      {(error || validationErrors.submission) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || validationErrors.submission}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Certificate upload */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <VerifiedIcon sx={{ mr: 1, color: 'success.main' }} />
            Certificado Digital (.cer)
          </Typography>

          <input
            accept=".cer,.crt,.pem,.der,application/x-x509-ca-cert,application/x-x509-user-cert,application/pkix-cert,application/x-pem-file"
            style={{ display: 'none' }}
            id="certificate-upload"
            type="file"
            onChange={handleCertificateUpload}
            disabled={loading}
          />
          <label htmlFor="certificate-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ mb: 1, py: 2 }}
              disabled={loading}
            >
              Cargar Certificado (.cer)
            </Button>
          </label>

          {certificateFile && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'success.50',
              p: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'success.200'
            }}>
              <VerifiedIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {certificateFile.name}
              </Typography>
              <IconButton
                size="small"
                onClick={removeCertificate}
                disabled={loading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {validationErrors.certificate && (
            <FormHelperText error>{validationErrors.certificate}</FormHelperText>
          )}
        </Grid>

        {/* Private key upload */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
            Llave Privada (.key)
          </Typography>

          <input
            accept=".key,.pem,.p8,.der,application/x-pem-file,application/pkcs8,application/x-pkcs8"
            style={{ display: 'none' }}
            id="private-key-upload"
            type="file"
            onChange={handlePrivateKeyUpload}
            disabled={loading}
          />
          <label htmlFor="private-key-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ mb: 1, py: 2 }}
              disabled={loading}
            >
              Cargar Llave Privada (.key)
            </Button>
          </label>

          {privateKeyFile && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'warning.50',
              p: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'warning.200'
            }}>
              <SecurityIcon sx={{ mr: 1, color: 'warning.main', fontSize: 16 }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {privateKeyFile.name}
              </Typography>
              <IconButton
                size="small"
                onClick={removePrivateKey}
                disabled={loading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {validationErrors.privateKey && (
            <FormHelperText error>{validationErrors.privateKey}</FormHelperText>
          )}
        </Grid>

        {/* Password input */}
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            type="password"
            label="Contraseña de la llave privada"
            value={signatureData[operatorConfig.password_field] || ''}
            onChange={handlePasswordChange}
            error={!!validationErrors.password}
            helperText={validationErrors.password || "Ingrese la contraseña de su llave privada"}
            disabled={loading}
            sx={{ mb: 2 }}
          />
        </Grid>

        {/* Submit button */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              disabled={loading || isSigningInProgress || !certificateFile || !privateKeyFile || !signatureData[operatorConfig.password_field]}
              sx={{ py: 2 }}
              startIcon={<SecurityIcon />}
            >
              {(loading || isSigningInProgress) ? 'Firmando documento...' : 'Firmar Digitalmente'}
            </Button>
            {(loading || isSigningInProgress) && (
              <LinearProgress
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  borderRadius: 1
                }}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Information box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Información importante:</strong>
          <br />
          • Su certificado digital debe estar vigente y no revocado
          <br />
          • La llave privada debe corresponder al certificado cargado
          <br />
          • La firma digital tendrá validez jurídica
          <br />
          • El documento firmado será almacenado de forma segura
        </Typography>
      </Alert>
      </form>
    </Paper>
  );
};

export default SigningForm;