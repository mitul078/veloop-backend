import mongoose from "mongoose"
import { Referral, ReferralCode, ReferralProgress, AdEvent, DeviceAccount, ReferralReward, FraudAttempt } from "./referral.model.js"

async function get_referral_code_by_user({ user_id }) {
    return ReferralCode.findOne({ user: user_id })
}

async function get_user_by_code({ code }) {
    return ReferralCode.findOne({ code })
}

async function save_code({ user_id, code }) {
    return ReferralCode.create({ user: user_id, code })
}

async function save_referral({ referrer_user, referred_user, code, status }) {
    return Referral.create({ referrer_user, referred_user, code, status })
}

async function get_referral_by_referred_user({ referred_user_id }) {
    return Referral.findOne({ referred_user: referred_user_id })
}

async function get_referrals_by_referrer(referrer_user_id, { page = 1, limit = 20, status } = {}) {
    const match = { referrer_user: new mongoose.Types.ObjectId(referrer_user_id) }
    if (status) match.status = status

    return Referral.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },

        {
            $lookup: {
                from: "referralprogresses",
                localField: "_id",
                foreignField: "referral",
                as: "progress"
            }
        },
        {
            $addFields: {
                eligible_ads_watched: { $ifNull: [{ $first: "$progress.eligible_ads_watched" }, 0] }
            }
        },
        {
            $project: { progress: 0 }
        }
    ])
}

async function get_referral_by_id({ referral_id }) {
    return Referral.findById(referral_id)
}

async function update_referral_status({ referral_id, status, completed_at }) {
    return Referral.findByIdAndUpdate(
        referral_id,
        { status, ...(completed_at ? { completed_at } : {}) },
        { new: true }
    )
}

async function save_referral_progress({ referral_id }) {
    return ReferralProgress.create({ referral: referral_id })
}

async function get_progress_by_referral({ referral_id }) {
    return ReferralProgress.findOne({ referral: referral_id })
}

async function increment_ads_watched({ referral_id }) {
    return ReferralProgress.findOneAndUpdate(
        { referral: referral_id },
        { $inc: { eligible_ads_watched: 1 }, $set: { last_verified_at: new Date() } },
        { new: true }
    )
}

async function save_reward({ referral_id, referrer_user, reward_type, reward_amount, milestone }) {
    return ReferralReward.create({
        referral: referral_id,
        referrer_user,
        reward_type,
        reward_amount,
        milestone,
        status: "CREDITED",
        credited_at: new Date()
    })
}

async function get_reward_totals_by_referrer({ referrer_user_id }) {
    // returns [{ _id: "SVE", total: 5000 }, { _id: "XP", total: 20 }]
    return ReferralReward.aggregate([
        { $match: { referrer_user: referrer_user_id, status: "CREDITED" } },
        { $group: { _id: "$reward_type", total: { $sum: "$reward_amount" } } }
    ])
}

async function save_ad_event({ user_id, provider_event_id }) {
    return AdEvent.create({ user: user_id, provider_event_id })
}

async function find_device_account({ visitorId }) {
    return DeviceAccount.findOne({ visitorId }).populate("userId", "email")
}

async function create_device_account({ visitorId, userId }) {
    return DeviceAccount.create({ visitorId, userId })
}

async function touch_device_account({ visitorId }) {
    return DeviceAccount.findOneAndUpdate(
        { visitorId },
        { $set: { lastSeenAt: new Date() } },
        { new: true }
    )
}


async function log_fraud_attempt({ type, user_id, referrer_user, visitorId, reason }) {
    return FraudAttempt.create({
        type,
        user_id: user_id || null,
        referrer_user: referrer_user || null,
        visitorId,
        reason
    })
}

export default {
    get_referral_code_by_user,
    get_user_by_code,
    save_code,
    save_referral,
    get_referral_by_referred_user,
    get_referrals_by_referrer,
    get_referral_by_id,
    update_referral_status,
    save_referral_progress,
    get_progress_by_referral,
    increment_ads_watched,
    save_reward,
    get_reward_totals_by_referrer,
    save_ad_event,
    find_device_account,
    create_device_account,
    touch_device_account,
    log_fraud_attempt
}