import crypto from "crypto"

const CODE_LENGTH = 6
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generateReferralCode() {
    let code = ""
    for (let i = 0; i < CODE_LENGTH; i++) {
        const idx = crypto.randomInt(0, CHARS.length)
        code += CHARS[idx]
    }
    return `VELOOP${code}`
}

export default generateReferralCode