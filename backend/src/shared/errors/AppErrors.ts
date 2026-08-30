export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} '${id}' not found.` : `${resource} not found.`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, "CONFLICT"); }
}

export class BadRequestError extends AppError {
  constructor(message: string) { super(message, 400, "BAD_REQUEST"); }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied.") { super(message, 403, "FORBIDDEN"); }
}

export class UnprocessableError extends AppError {
  constructor(message: string) { super(message, 422, "UNPROCESSABLE"); }
}