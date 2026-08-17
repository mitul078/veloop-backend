import "dotenv/config"

function required(key) {
    const value = process.env[key]
    if (!value) {
        throw new Error("ENV MISSING")
    }
    return value
}

const env = {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || "development",
    db: {
        mongodb_uri: required("MONGO_URI")
    },
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    jwt: {
        access_token: required("ACCESS_TOKEN"),
        refresh_token: required("REFRESH_TOKEN"),
        access_token_expiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
        refresh_token_expiry: process.env.REFRESH_TOKEN_EXPIRY || "7d"
    },
    deviceHashSecret: required("DEVICE_HASH_SECRET")
}

export default env