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
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173"
}

export default env