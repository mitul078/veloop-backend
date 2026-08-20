import referralRepository from "./referral.repository.js";
import hash_device from "../../shared/utils/device_hash.js";
import { hash_fingerprint } from "../../shared/utils/device_hash.js";

async function check_self_referral({ current_user_id, device_id, user_agent, fingerprint }) {
    if (!device_id) return { is_fraud: false }

    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    const existing_link = await referralRepository.find_device_link({ device_hash, fingerprint_hash })

    if (existing_link && existing_link.user._id.toString() !== current_user_id.toString()) {
        return {
            is_fraud: true,
            reason: "DEVICE_ALREADY_ASSOCIATED",
            device_hash,
            matched_email: existing_link.user.email
        }
    }

    await referralRepository.record_device_link({ user_id: current_user_id, device_hash, fingerprint_hash })
    return { is_fraud: false }
}


async function check_device_registered({ device_id, user_agent, fingerprint }) {
    if (!device_id) return { blocked: false }

    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    const existing_device = await referralRepository.find_device_link({ device_hash, fingerprint_hash })

    if (existing_device) {
        return {
            blocked: true,
            matched_email: existing_device.user.email,
            device_hash
        }
    }

    return { blocked: false, device_hash }
}

async function link_device_to_user({ user_id, device_id, user_agent, fingerprint }) {
    if (!device_id) return
    const device_hash = hash_device({ device_id, user_agent })
    const fingerprint_hash = fingerprint ? hash_fingerprint({ fingerprint }) : null
    await referralRepository.record_device_link({ user_id, device_hash, fingerprint_hash })
}

export default {
    check_self_referral,
    check_device_registered,
    link_device_to_user
}