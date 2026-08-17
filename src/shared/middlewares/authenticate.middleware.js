import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { UnauthorizedError  } from "../errors/error_type.js";

function authenticate(req, res, next) {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null

    if (!token) {
        return next(new UnauthorizedError("AUTHENTICATION REQUIRED"))
    }

    try {
        const decoded = jwt.verify(token, env.jwt.access_token)
        req.user = { id: decoded.id, email: decoded.email }
        next()
    } catch (err) {
        next(new UnauthorizedError("TOKEN INVALID"))
    }
}

export default authenticate