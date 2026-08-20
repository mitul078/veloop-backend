import crypto from "crypto"

function ensure_device_token(req, res, next) {
    let token = req.cookies.device_token

    if (!token) {
        token = crypto.randomUUID()

        res.cookie("device_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 400 * 24 * 60 * 60 * 1000
        })
    }

    req.device_token = token
    req.client_fingerprint = req.headers["x-fingerprint"] || null
    next()
}

export default ensure_device_token