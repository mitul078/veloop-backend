import { FingerprintJsServerApiClient, Region } from "@fingerprintjs/fingerprintjs-pro-server-api"
import env from "../config/env.js"

const region_map = {
    us: Region.Global,
    eu: Region.EU,
    ap: Region.AP
}

const client = new FingerprintJsServerApiClient({
    apiKey: env.fingerprint.secret_key,
    region: region_map[env.fingerprint.region] || Region.Global
})

async function verify_identification({ requestId }) {
    if (!requestId) {
        throw new Error("MISSING_FINGERPRINT_REQUEST_ID")
    }

    const event = await client.getEvent(requestId)

    const identification = event?.products?.identification?.data
    if (!identification) {
        throw new Error("FINGERPRINT_VERIFICATION_FAILED")
    }

    return {
        visitorId: identification.visitorId,
        confidence: identification.confidence?.score,
        incognito: event?.products?.incognito?.data?.result ?? false,
        vpn: event?.products?.vpn?.data?.result ?? false,
        bot: event?.products?.botd?.data?.bot?.result ?? "notDetected"
    }
}

export default {
    verify_identification
}