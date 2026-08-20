import env from "../../shared/config/env.js";
import { NotFoundError, UnauthorizedError, ValidationError, ConflictError } from "../../shared/errors/error_type.js";
import fraudDetectionService from "../referral/fraud-detection.service.js";
import authRepository from "./auth.repository.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import AppError from "../../shared/errors/app_error.js";
import mask_email from "../../shared/utils/email_mask.js";

const graceWindowCache = new Map();
const inFlightRotations = new Map();

async function register_user({ email, password, device_id, user_agent, fingerprint, ip }) {
    const device_check = await fraudDetectionService.check_device_registered({ device_id, user_agent, fingerprint, ip })
    if (device_check.blocked) {
        throw new AppError(
            "This device already has a VELOOP Rewards account. Please log in instead.",
            409,
            "ACCOUNT_ALREADY_EXISTS_ON_DEVICE",
            true,
            { maskedEmail: mask_email(device_check.matched_email) }
        )
    }

    const hash_password = await bcrypt.hash(password, 10)

    try {
        const save_user = await authRepository.create_user({ email, password: hash_password })
        await fraudDetectionService.link_device_to_user({
            user_id: save_user._id, device_id, user_agent, fingerprint, ip
        })

        if (device_check.flagged_for_review) {
            // IP-only match at registration — allow it through, just log for later review
            await fraudDetectionService.flag_registration_for_review({
                user_id: save_user._id,
                reason: "IP_ONLY_MATCH",
                matched_email: device_check.matched_email
            })
        }

        return { id: save_user._id, email }
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.email) throw new ConflictError("Email already registered.", "USER_ALREADY_EXISTS")
        }
        throw error
    }
}
async function login_user({ email, password }) {
    const user = await authRepository.get_user_with_password({ email })

    let check_password = false;
    if (user) {
        check_password = await bcrypt.compare(password, user.password)
    } else {
        const dummyHash = "$2a$10$vN4k1v49W0kPzC.b3D3D3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3";
        await bcrypt.compare(password, dummyHash);
    }

    if (!user || !check_password) {
        throw new UnauthorizedError("Invalid email or password.", "CREDENTIALS_INCORRECT")
    }

    const session_id = crypto.randomUUID()
    const payload = {
        id: user._id,
        email: user.email
    }

    const access_token = jwt.sign(payload, env.jwt.access_token, { expiresIn: env.jwt.access_token_expiry })
    const refresh_token = jwt.sign({ ...payload, session_id, jti: crypto.randomUUID() }, env.jwt.refresh_token, { expiresIn: env.jwt.refresh_token_expiry })

    const decoded = jwt.verify(refresh_token, env.jwt.refresh_token)
    const expires_at = new Date(decoded.exp * 1000)

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")

    await authRepository.create_refresh_token({
        user_id: user._id,
        session_id,
        refresh_token: hash_refresh_token,
        expires_at
    })

    return {
        user: payload,
        access_token,
        refresh_token,
    }
}

async function rotate_token({ refresh_token }) {
    if (!refresh_token) {
        throw new UnauthorizedError("Invalid or expired refresh token.", "TOKEN_INVALID")
    }

    let decode
    try {
        decode = jwt.verify(refresh_token, env.jwt.refresh_token)
    } catch (err) {
        throw new UnauthorizedError("Invalid or expired refresh token.", "TOKEN_INVALID")
    }

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")

    if (inFlightRotations.has(hash_refresh_token)) {
        return inFlightRotations.get(hash_refresh_token)
    }

    if (graceWindowCache.has(hash_refresh_token)) {
        return graceWindowCache.get(hash_refresh_token)
    }

    const rotationPromise = (async () => {
        try {
            const stored_refresh_token = await authRepository.rotate_token_atomic({
                refresh_token: hash_refresh_token
            })

            if (!stored_refresh_token) {

                const existing_token = await authRepository.get_refresh_token({ refresh_token: hash_refresh_token })
                if (existing_token) {
                    await authRepository.revoke_session({ session_id: existing_token.session_id })
                    throw new UnauthorizedError("Session revoked due to token reuse. Please log in again.", "LOGIN_AGAIN")
                }

                if (decode.session_id) {
                    await authRepository.revoke_session({ session_id: decode.session_id })
                    throw new UnauthorizedError("Session revoked due to token reuse. Please log in again.", "LOGIN_AGAIN")
                }

                throw new UnauthorizedError("Invalid or expired refresh token.", "TOKEN_INVALID")
            }

            if (stored_refresh_token.expires_at < new Date()) {
                throw new UnauthorizedError("Invalid or expired refresh token.", "TOKEN_INVALID")
            }

            const user = await authRepository.get_user_by_id(stored_refresh_token.user_id)
            if (!user) {
                throw new UnauthorizedError("Invalid or expired refresh token.", "TOKEN_INVALID")
            }

            const payload = {
                id: user._id,
                email: user.email
            }

            const access_token = jwt.sign(payload, env.jwt.access_token, { expiresIn: env.jwt.access_token_expiry })
            const new_refresh_token = jwt.sign(
                { ...payload, session_id: stored_refresh_token.session_id, jti: crypto.randomUUID() },
                env.jwt.refresh_token,
                { expiresIn: env.jwt.refresh_token_expiry }
            )

            const decodedNew = jwt.verify(new_refresh_token, env.jwt.refresh_token)
            const new_expires_at = new Date(decodedNew.exp * 1000)

            const new_hash_refresh_token = crypto.createHash("sha256").update(new_refresh_token).digest("hex")

            await authRepository.create_refresh_token({
                user_id: user._id,
                session_id: stored_refresh_token.session_id,
                refresh_token: new_hash_refresh_token,
                expires_at: new_expires_at
            })

            await authRepository.delete_revoked_tokens_for_session({ session_id: stored_refresh_token.session_id })

            const result = {
                user: payload,
                access_token,
                refresh_token: new_refresh_token
            }

            graceWindowCache.set(hash_refresh_token, result)
            setTimeout(() => {
                graceWindowCache.delete(hash_refresh_token)
            }, 5000)

            return result
        } finally {
            inFlightRotations.delete(hash_refresh_token)
        }
    })()

    inFlightRotations.set(hash_refresh_token, rotationPromise)
    return rotationPromise
}
async function logout_user({ refresh_token }) {
    if (!refresh_token) return

    let session_id
    try {
        const decoded = jwt.verify(refresh_token, env.jwt.refresh_token)
        session_id = decoded.session_id
    } catch (err) {
        try {
            const decoded = jwt.decode(refresh_token)
            session_id = decoded?.session_id
        } catch (e) { }
    }

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")
    const stored_refresh_token = await authRepository.get_refresh_token({ refresh_token: hash_refresh_token })

    const final_session_id = stored_refresh_token?.session_id || session_id

    if (final_session_id) {
        await authRepository.revoke_session({ session_id: final_session_id })
    }
}

export default {
    register_user,
    login_user,
    rotate_token,
    logout_user
}