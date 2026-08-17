class AppError extends Error {
    constructor(message, status_code, code, is_operational = true, extra = {}) {
        super(message)
        this.status_code = status_code
        this.code = code
        this.is_operational = is_operational
        this.extra = extra

        Error.captureStackTrace(this, this.constructor)

    }
}

export default AppError