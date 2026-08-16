import logger from "../logs/logger.js";

export function not_found_handler(req, res, next) {
    res.status(404).json({
        success: false,
        code: "ROUTE_NOT_FOUND",
        message: `No route found for ${req.method} ${req.originalUrl}`
    })
}

export function error_handler(err, req, res, next) {

    const status_code = err.status_code || 500
    const code = err.code || "INTERNAL_ERROR"
    const message = err.is_operational ? err.message : "SOMETHING WENT WRONG"


    if (err.is_operational) {
        logger.warn(err.message, {
            code,
            status_code,
            path: req.originalUrl,
            method: req.method
        })
    }
    else {
        logger.error(err.message, {
            stack: err.stack,
            status_code,
            path: req.originalUrl,
            method: req.method
        })
    }

    res.status(status_code).json({
        success: false,
        code,
        message
    })
}