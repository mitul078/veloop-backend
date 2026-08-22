import referralRepository from "./referral.repository.js";
import fingerprintService from "../../shared/services/fingerprint.service.js";

async function verify_and_check_device({ requestId }) {
    const { visitorId } = await fingerprintService.verify_identification({ requestId })

    const existing = await referralRepository.find_device_account({ visitorId })

    return { visitorId, existing }
}

async function check_device_registered({ requestId }) {
    const { visitorId, existing } = await verify_and_check_device({ requestId })

    if (existing) {
        return { blocked: true, visitorId }
    }

    return { blocked: false, visitorId }
}

async function bind_device_to_user({ visitorId, user_id }) {
    return referralRepository.create_device_account({ visitorId, userId: user_id })
}

async function check_self_referral({ current_user_id, requestId }) {
    const { visitorId, existing } = await verify_and_check_device({ requestId })

    if (existing && existing.userId._id.toString() !== current_user_id.toString()) {
        return { is_fraud: true, reason: "DEVICE_ALREADY_ASSOCIATED", visitorId }
    }

    return { is_fraud: false, visitorId }
}

async function log_fraud_attempt({ type, user_id, referrer_user, visitorId, reason }) {
    return referralRepository.log_fraud_attempt({ type, user_id, referrer_user, visitorId, reason })
}

export default {
    check_device_registered,
    bind_device_to_user,
    check_self_referral,
    log_fraud_attempt
}