import crypto from "crypto"
import env from "../config/env.js"

function hash_device({ device_id, user_agent }) {
    return crypto.createHmac("sha256", env.deviceHashSecret)
        .update(`${device_id}::${user_agent || ""}`)
        .digest("hex")
}
export function hash_fingerprint({ fingerprint }) {
    return crypto.createHash("sha256").update(fingerprint).digest("hex")
}

export function hash_ip({ ip }) {
    return crypto.createHash("sha256").update(ip).digest("hex")
}


export default hash_device