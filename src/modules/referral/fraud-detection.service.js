import referralRepository from "./referral.repository.js";
import hash_device from "../../shared/utils/device_hash.js";
import { hash_fingerprint, hash_ip } from "../../shared/utils/device_hash.js";

async function check_self_referral({ current_user_id, device_id, user_agent, fingerprint, ip }) {
    if (!device_id) return { is_fraud: false }

    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    const ip_hash = ip ? hash_ip({ ip }) : null

    const result = await referralRepository.find_device_link_detailed({
        device_hash, fingerprint_hash, ip_hash, current_user_id
    })

    if (!result) {
        await referralRepository.record_device_link({ user_id: current_user_id, device_hash, fingerprint_hash, ip_hash })
        return { is_fraud: false }
    }

    // no need for the self-check anymore — query already excludes current_user_id
    if (result.confidence === "high") {
        return {
            is_fraud: true,
            reason: "DEVICE_ALREADY_ASSOCIATED",
            device_hash,
            matched_email: result.match.user.email
        }
    }

    return {
        is_fraud: false,
        flagged_for_review: true,
        reason: "IP_ONLY_MATCH",
        matched_email: result.match.user.email
    }
}


async function check_device_registered({ device_id, user_agent, fingerprint, ip }) {
    if (!device_id) return { blocked: false }

    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    const ip_hash = ip ? hash_ip({ ip }) : null

    const result = await referralRepository.find_device_link_detailed({
        device_hash, fingerprint_hash, ip_hash, current_user_id: null
    })

    if (!result) return { blocked: false, device_hash }

    if (result.confidence === "high") {
        return { blocked: true, matched_email: result.match.user.email, device_hash }
    }

    // IP-only match at registration — allow it, don't block
    return { blocked: false, device_hash, flagged_for_review: true, matched_email: result.match.user.email }
}

async function link_device_to_user({ user_id, device_id, user_agent, fingerprint, ip }) {
    if (!device_id) return
    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    const ip_hash = ip ? hash_ip({ ip }) : null

    await referralRepository.record_device_link({ user_id, device_hash, fingerprint_hash, ip_hash })
}

async function flag_registration_for_review({ user_id, reason, matched_email }) {
    await referralRepository.save_registration_flag({ user_id, reason, matched_email })
}

export default {
    check_self_referral,
    check_device_registered,
    link_device_to_user,
    flag_registration_for_review
}