import { ValidationError } from "../errors/error_type.js"

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query
        })

        if (!result.success) {
            const message = result.error.issues.map(e => e.message).join(", ")
            return next(new ValidationError(message, "VALIDATION_ERROR"))
        }

        next()
    }
}

export default validate