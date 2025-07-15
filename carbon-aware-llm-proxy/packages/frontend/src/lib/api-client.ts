const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  id?: string;
  data?: T;
  status?: number;
  statusText?: string;
  headers?: any;
  config?: any;
  request?: any;
  error?: {
    message: string;
    code?: string | number;
  };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!response.ok) {
    const errorData = isJson ? await response.json() : await response.text();
    
    const errorMessage = isJson 
      ? errorData.message || errorData.error || 'An error occurred'
      : errorData || 'An error occurred';
    
    console.error('API Error:', errorMessage);
    
    return { 
      error: { 
        message: errorMessage,
        code: response.status,
      },
      data: undefined,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config: {},
    } as ApiResponse<T>;
  }
  
  const data = isJson ? await response.json() : await response.text();
  return { 
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config: {},
  } as ApiResponse<T>;
}

export async function apiGet<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
    
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API GET request failed:', error);
    console.error('Network Error: Unable to connect to the server. Please check your connection.');
    return { error: { message: 'Network error' } };
  }
}

export async function apiPost<T = any>(
  endpoint: string,
  data: any = {},
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const isFormData = data instanceof FormData;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: {
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include',
    });
    
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API POST request failed:', error);
    console.error('Network Error: Unable to connect to the server. Please check your connection.');
    return { error: { message: 'Network error' } };
  }
}

export async function apiPut<T = any>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API PUT request failed:', error);
    console.error('Network Error: Unable to connect to the server. Please check your connection.');
    return { error: { message: 'Network error' } };
  }
}

export async function apiDelete<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
    
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API DELETE request failed:', error);
    console.error('Network Error: Unable to connect to the server. Please check your connection.');
    return { error: { message: 'Network error' } };
  }
}

// Helper function to add auth headers
export function withAuth(headers: HeadersInit = {}): HeadersInit {
  // In a real app, you'd get the token from your auth store
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  return {
    ...headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}
