import crypto from "crypto"
import env from "../config/env.js"

function hash_device({ device_id, user_agent }) {
    return crypto.createHmac("sha256", env.deviceHashSecret)
        .update(`${device_id}::${user_agent || ""}`)
        .digest("hex")
}

export default hash_device