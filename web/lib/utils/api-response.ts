export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; message?: string };

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function err(error: string, message?: string): ApiError {
  return { success: false, error, message };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(v: string): boolean {
  return UUID_RE.test(v);
}
