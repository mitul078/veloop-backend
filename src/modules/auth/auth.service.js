import env from "../../shared/config/env.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../shared/errors/error_type.js";
import authRepository from "./auth.repository.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"


async function register_user({ email, password, phone }) {
    const hash_password = await bcrypt.hash(password, 10)

    try {
        const save_user = await authRepository.create_user({ email, password: hash_password, phone })

        return { id: save_user._id, email }

    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.email) throw new ValidationError("USER ALREADY EXISTS")
        }
        throw error
    }
}

async function login_user({ email, password }) {
    const user = await authRepository.get_user_with_password({ email })
    if (!user) {
        throw new NotFoundError("USER NOT FOUND")
    }
    const check_password = await bcrypt.compare(password, user.password)
    if (!check_password) {
        throw new ValidationError("CREDENTIALS INCORRECT")
    }

    const session_id = crypto.randomUUID()
    const payload = {
        id: user._id,
        email: user.email
    }

    const access_token = jwt.sign(payload, env.jwt.access_token, { expiresIn: env.jwt.access_token_expiry })
    const refresh_token = jwt.sign({ ...payload, session_id }, env.jwt.refresh_token, { expiresIn: env.jwt.refresh_token_expiry })

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")

    await authRepository.create_refresh_token({
        user_id: user._id,
        session_id,
        refresh_token: hash_refresh_token,
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
    })

    return {
        user: payload,
        access_token,
        refresh_token,
    }

}


async function rotate_token({ refresh_token }) {
    let decode

    try {

        decode = jwt.verify(refresh_token, env.jwt.refresh_token)

    } catch (err) {
        throw new UnauthorizedError("TOKEN INVALID")
    }

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")
    const stored_refresh_token = await authRepository.get_refresh_token({ refresh_token: hash_refresh_token })
    if (!stored_refresh_token) {
        throw new UnauthorizedError("TOKEN INVALID")
    }

    if (stored_refresh_token.revoked) {
        await authRepository.revoke_session({ session_id: stored_refresh_token.session_id })
        throw new UnauthorizedError("LOGIN AGAIN")
    }

    await authRepository.revoke_token({ refresh_token: hash_refresh_token })
    const user = await authRepository.get_user_by_id(stored_refresh_token.user_id)
    if (!user) {
        throw new NotFoundError("USER NOT FOUND")
    }

    const payload = {
        id: user._id,
        email: user.email
    }

    const access_token = jwt.sign(payload, env.jwt.access_token, { expiresIn: env.jwt.access_token_expiry })
    const new_refresh_token = jwt.sign({ ...payload, session_id: stored_refresh_token.session_id }, env.jwt.refresh_token, { expiresIn: env.jwt.refresh_token_expiry })

    const new_hash_refresh_token = crypto.createHash("sha256").update(new_refresh_token).digest("hex")

    await authRepository.create_refresh_token({
        user_id: user._id,
        session_id: stored_refresh_token.session_id,
        refresh_token: new_hash_refresh_token,
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
    })

    return {
        user: payload, access_token, refresh_token: new_refresh_token
    }
}

async function logout_user({ refresh_token }) {
    if (!refresh_token) return

    const hash_refresh_token = crypto.createHash("sha256").update(refresh_token).digest("hex")
    const stored_refresh_token = await authRepository.get_refresh_token({ refresh_token: hash_refresh_token })
    if (!stored_refresh_token) return

    await authRepository.revoke_session({ session_id: stored_refresh_token.session_id })
}


export default {
    register_user,
    login_user,
    rotate_token,
    logout_user
}