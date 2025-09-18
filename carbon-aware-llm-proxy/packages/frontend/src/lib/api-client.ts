const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://carbon-aware-backend-dev:3001";

function makeRequestId(prefix: string = "fe"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    const errorData = isJson ? await response.json() : await response.text();

    const errorMessage = isJson
      ? errorData.message || errorData.error || "An error occurred"
      : errorData || "An error occurred";

    console.error("API Error:", errorMessage);

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
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestId = makeRequestId("get");
    const started = Date.now();
    console.log("[apiGet] ->", { url, endpoint, options: { ...options, headers: undefined }, requestId });

    const response = await fetch(url, {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...options.headers,
      },
      credentials: "include",
    });

    const duration = Date.now() - started;
    console.log("[apiGet] <-", { url, status: response.status, requestId, durationMs: duration });
    return handleResponse<T>(response);
  } catch (error) {
    console.error("API GET request failed:", error);
    console.error(
      "Network Error: Unable to connect to the server. Please check your connection.",
    );
    return { error: { message: "Network error" } };
  }
}

export async function apiPost<T = any>(
  endpoint: string,
  data: any = {},
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const isFormData = data instanceof FormData;

    const url = `${API_BASE_URL}${endpoint}`;
    const requestId = makeRequestId("post");
    const started = Date.now();
    console.log("[apiPost] ->", {
      url,
      endpoint,
      isFormData,
      dataPreview: isFormData ? "FormData" : JSON.stringify(data).slice(0, 500),
      options: { ...options, headers: undefined },
      requestId,
    });

    const response = await fetch(url, {
      ...options,
      method: "POST",
      headers: {
        ...(!isFormData && { "Content-Type": "application/json" }),
        "X-Request-Id": requestId,
        ...options.headers,
      },
      body: isFormData ? data : JSON.stringify(data),
      credentials: "include",
    });

    const duration = Date.now() - started;
    console.log("[apiPost] <-", { url, status: response.status, requestId, durationMs: duration });
    return handleResponse<T>(response);
  } catch (error) {
    console.error("API POST request failed:", error);
    console.error(
      "Network Error: Unable to connect to the server. Please check your connection.",
    );
    return { error: { message: "Network error" } };
  }
}

export async function apiPut<T = any>(
  endpoint: string,
  data: any,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestId = makeRequestId("put");
    const started = Date.now();
    console.log("[apiPut] ->", {
      url,
      endpoint,
      dataPreview: JSON.stringify(data).slice(0, 500),
      options: { ...options, headers: undefined },
      requestId,
    });

    const response = await fetch(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...options.headers,
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const duration = Date.now() - started;
    console.log("[apiPut] <-", { url, status: response.status, requestId, durationMs: duration });
    return handleResponse<T>(response);
  } catch (error) {
    console.error("API PUT request failed:", error);
    console.error(
      "Network Error: Unable to connect to the server. Please check your connection.",
    );
    return { error: { message: "Network error" } };
  }
}

export async function apiDelete<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestId = makeRequestId("del");
    const started = Date.now();
    console.log("[apiDelete] ->", { url, endpoint, options: { ...options, headers: undefined }, requestId });

    const response = await fetch(url, {
      ...options,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...options.headers,
      },
      credentials: "include",
    });

    const duration = Date.now() - started;
    console.log("[apiDelete] <-", { url, status: response.status, requestId, durationMs: duration });
    return handleResponse<T>(response);
  } catch (error) {
    console.error("API DELETE request failed:", error);
    console.error(
      "Network Error: Unable to connect to the server. Please check your connection.",
    );
    return { error: { message: "Network error" } };
  }
}

