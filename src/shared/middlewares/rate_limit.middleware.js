import rateLimit from "express-rate-limit";
import { RateLimitError } from "../errors/error_type.js";

// Shared handler so every limiter returns the same error shape
const rate_limit_handler = (req, res, next) => {
    next(new RateLimitError("Too many requests. Please try again later.", "RATE_LIMITED"));
};

// Login / refresh-token — moderate limit, credential stuffing protection
export const auth_rate_limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: rate_limit_handler
});

// Registration — tighter limit, since account creation is the cheapest abuse vector
// (incognito/device-cookie bypass makes this the primary backstop)
export const register_rate_limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per IP per hour
    standardHeaders: true,
    legacyHeaders: false,
    handler: rate_limit_handler
});

// Referral attribution — already has a route-level limiter (5/min) in referral.route.js;
// this one is for general referral-module endpoints if applied broadly
export const referral_rate_limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rate_limit_handler
});

// Referral code lookup — currently unauthenticated, so this is the only thing
// stopping someone from enumerating/brute-forcing valid referral codes
export const validate_code_rate_limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rate_limit_handler
});