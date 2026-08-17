import referralRepository from "./referral.repository.js";
import hash_device from "../../shared/utils/device_hash.js";

async function check_self_referral({ current_user_id, device_id, user_agent }) {
    if (!device_id) return { is_fraud: false }

    const device_hash = hash_device({ device_id, user_agent })
    const existing_link = await referralRepository.find_device_link({ device_hash })

    await referralRepository.record_device_link({ user_id: current_user_id, device_hash })

    if (existing_link && existing_link.user._id.toString() !== current_user_id.toString()) {
        return {
            is_fraud: true,
            reason: "DEVICE_ALREADY_ASSOCIATED",
            device_hash,
            matched_email: existing_link.user.email
        }
    }

    return { is_fraud: false }
}

export default { check_self_referral }