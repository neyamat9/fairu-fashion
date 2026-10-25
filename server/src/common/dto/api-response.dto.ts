export class SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export class ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  errors?: unknown;
}
