import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiConfig {
  baseURL: string;
  apiBasePath: string;
  tenant?: string;
  timeout?: number;
}

export interface AuthProvider {
  getToken(): string | undefined | Promise<string | undefined>;
  refreshToken(minValidity?: number): Promise<boolean>;
  isAuthenticated(): boolean;
}

/**
 * Base API service that can be used by both web and mobile
 * Platform-specific implementations will provide the auth provider
 */
export class BaseApiService {
  protected axiosInstance: AxiosInstance;
  protected config: ApiConfig;
  protected authProvider?: AuthProvider;

  constructor(config: ApiConfig, authProvider?: AuthProvider) {
    this.config = config;
    this.authProvider = authProvider;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL + config.apiBasePath,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.authProvider) {
          const token = await this.authProvider.getToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }

        // Add tenant header if configured
        if (this.config.tenant) {
          config.headers['X-Tenant-ID'] = this.config.tenant;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry && this.authProvider) {
          originalRequest._retry = true;

          try {
            console.log('[API] Got 401, attempting token refresh');
            const refreshed = await this.authProvider.refreshToken(30);

            if (refreshed) {
              console.log('[API] Token refreshed successfully, retrying request');
              const token = await this.authProvider.getToken();
              if (token) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('[API] Token refresh error:', refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Workflow endpoints
  async getWorkflows() {
    const response = await this.axiosInstance.get('/workflows/');
    return response.data;
  }

  async getWorkflowCatalog() {
    const response = await this.axiosInstance.get('/workflows/catalog');
    return response.data;
  }

  async getWorkflowById(id: string) {
    const response = await this.axiosInstance.get(`/workflows/${id}`);
    return response.data;
  }

  async createInstance(workflowId: string, data: any) {
    const response = await this.axiosInstance.post('/instances/', {
      workflow_id: workflowId,
      ...data,
    });
    return response.data;
  }

  async getInstance(instanceId: string) {
    const response = await this.axiosInstance.get(`/instances/${instanceId}`);
    return response.data;
  }

  async getInstances(params?: any) {
    const response = await this.axiosInstance.get('/instances/', { params });
    return response.data;
  }

  async validateCitizenData(instanceId: string, data: any) {
    const response = await this.axiosInstance.post(
      `/instances/${instanceId}/validate-citizen-data`,
      data
    );
    return response.data;
  }

  // Entity endpoints
  async getEntities() {
    const response = await this.axiosInstance.get('/entities/');
    return response.data;
  }

  async getEntity(entityId: string) {
    const response = await this.axiosInstance.get(`/entities/${entityId}`);
    return response.data;
  }

  async createEntity(data: any) {
    const response = await this.axiosInstance.post('/entities/', data);
    return response.data;
  }

  async updateEntity(entityId: string, data: any) {
    const response = await this.axiosInstance.put(`/entities/${entityId}`, data);
    return response.data;
  }

  // Document endpoints
  async uploadDocument(file: any, metadata?: any) {
    const formData = new FormData();

    // Handle different file types (web File vs mobile)
    if (file instanceof File) {
      // Web
      formData.append('file', file);
    } else if (file.uri) {
      // React Native
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'document',
      } as any);
    }

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.axiosInstance.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getDocument(documentId: string) {
    const response = await this.axiosInstance.get(`/documents/${documentId}`);
    return response.data;
  }

  // Public endpoints (no auth required)
  async getPublicWorkflows(params?: any) {
    const response = await this.axiosInstance.get('/public/workflows', { params });
    return response.data;
  }

  async getPublicWorkflowCatalog() {
    const response = await this.axiosInstance.get('/public/workflows/catalog');
    return response.data;
  }

  // Track workflow instance
  async trackWorkflowInstance(instanceId: string) {
    const response = await this.axiosInstance.get(`/public/track/${instanceId}`);
    return response.data;
  }

  // Submit citizen data
  async submitCitizenData(instanceId: string, formData: FormData) {
    const response = await this.axiosInstance.post(
      `/public/instances/${instanceId}/submit-data`,
      formData,
      {
        headers: {
          // Let axios set the Content-Type with boundary for FormData
        },
      }
    );
    return response.data;
  }

  // Generic request method for custom endpoints
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.request<T>(config);
    return response.data;
  }

  // Get axios instance for direct use if needed
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}