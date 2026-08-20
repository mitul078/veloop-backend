import rateLimit from "express-rate-limit";
import { RateLimitError } from "../errors/error_type.js";

export const auth_rate_limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per window
    standardHeaders: true, // Return rate limit info in standard headers
    legacyHeaders: false, // Disable legacy X-RateLimit headers
    handler: (req, res, next) => {
        next(new RateLimitError("Too many requests. Please try again later.", "RATE_LIMITED"));
    }
});
