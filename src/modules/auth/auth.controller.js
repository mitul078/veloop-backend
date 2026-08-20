import ApiResponse from "../../shared/utils/api_response.js";
import authService from "./auth.service.js";
import env from "../../shared/config/env.js";

const isProd = env.env === "production"

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
}

async function register(req, res, next) {
    try {
        const { email, password } = req.body
        const user = await authService.register_user({
            email,
            password,
            device_id: req.device_token,
            user_agent: req.headers["user-agent"],
            fingerprint: req.client_fingerprint,
            ip:req.ip
        })
        return res.status(201).json(new ApiResponse(user, "REGISTER SUCCESSFUL"))
    } catch (error) {
        next(error)
    }
}

async function login(req, res, next) {
    try {

        const { email, password } = req.body
        const { user, access_token, refresh_token } = await authService.login_user({ email, password })

        res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS)

        return res.status(200).json(new ApiResponse({ user, access_token }, "LOGIN SUCCESSFUL"))

    } catch (error) {
        next(error)
    }
}

async function rotate_token(req, res, next) {
    try {

        const token = req.cookies.refresh_token
        const { access_token, refresh_token } = await authService.rotate_token({ refresh_token: token })

        res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS)

        return res.status(200).json(new ApiResponse({ access_token }, "TOKEN REFRESHED"))

    } catch (error) {
        next(error)

    }
}

async function logout(req, res, next) {
    try {

        const token = req.cookies.refresh_token
        await authService.logout_user({ refresh_token: token })

        res.clearCookie("refresh_token", REFRESH_COOKIE_OPTIONS)

        return res.status(200).json(new ApiResponse(null, "LOGOUT SUCCESSFUL"))

    } catch (error) {
        next(error)

    }
}


export default {
    register,
    login,
    rotate_token,
    logout
}