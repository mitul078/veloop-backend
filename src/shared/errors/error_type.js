import AppError from "./app_error.js";

export class NotFoundError extends AppError {
    constructor(message = "The requested resource was not found.", code = "NOT_FOUND") {
        super(message, 404, code)
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "You do not have permission to perform this action.", code = "FORBIDDEN") {
        super(message, 403, code)
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Authentication is required.", code = "UNAUTHORIZED") {
        super(message, 401, code)
    }
}

export class ConflictError extends AppError {
    constructor(message = "This resource already exists or conflicts with an existing one.", code = "CONFLICT") {
        super(message, 409, code)
    }
}

export class ValidationError extends AppError {
    constructor(message = "The provided input is invalid.", code = "INVALID_INPUT") {
        super(message, 400, code)
    }
}

export class RateLimitError extends AppError {
    constructor(message = "Too many requests. Please try again later.", code = "RATE_LIMITED") {
        super(message, 429, code)
    }
}