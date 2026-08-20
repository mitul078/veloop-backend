import referralRepository from "./referral.repository.js";
import generateReferralCode from "../../shared/utils/generate_code.js";
import { ValidationError } from "../../shared/errors/error_type.js";
import env from "../../shared/config/env.js";
import fraudDetectionService from "./fraud-detection.service.js";
import AppError from "../../shared/errors/app_error.js";
import mask_email from "../../shared/utils/email_mask.js";


async function get_or_create_code({ user_id }) {
    const existing = await referralRepository.get_referral_code_by_user({ user_id })
    if (existing) return existing.code

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateReferralCode()
        try {
            const saved = await referralRepository.save_code({ user_id, code })
            return saved.code

        } catch (error) {
            if (error.code === 11000) continue
            throw error
        }
    }

    throw new Error("FAILED TO GENERATE UNIQUE REFERRAL CODE")
}

async function attribute_referral({ current_user_id, code, device_id, user_agent }) {
    const code_owner = await referralRepository.get_user_by_code({ code })
    if (!code_owner) throw new ValidationError("INVALID REFERRAL CODE")

    const referrer_user_id = code_owner.user.toString()
    if (referrer_user_id === current_user_id.toString()) {
        throw new ValidationError("YOU CAN'T REFER YOURSELF")
    }

    const fraud_result = await fraudDetectionService.check_self_referral({
        current_user_id, device_id, user_agent
    })

    if (fraud_result.is_fraud) {
        await referralRepository.save_spam_referral({
            referrer_user: referrer_user_id,
            referred_user: current_user_id,
            reason: fraud_result.reason,
            device_hash: fraud_result.device_hash,
            risk_score: 90
        })

        throw new AppError(
            "This device has already been associated with a VELOOP Rewards account. Please use that account to log in.",
            409,
            "SELF_REFERRAL_DETECTED",
            true,
            { maskedEmail: mask_email(fraud_result.matched_email) }
        )
    }

    try {

        const referral = await referralRepository.save_referral({
            referrer_user: referrer_user_id,
            referred_user: current_user_id,
            code,
            status: "PENDING"
        })

        await referralRepository.save_referral_progress({ referral_id: referral._id })
        return referral

    } catch (error) {
        if (error.code === 11000) {
            throw new ValidationError("REFERRAL ALREADY ASSIGNED")
        }
        throw error
    }
}

async function dashboard({ user_id }) {
    const referral_code = await get_or_create_code({ user_id })

    const [referrals, reward_totals, spam_count] = await Promise.all([
        referralRepository.get_referrals_by_referrer(user_id, { limit: 20 }),
        referralRepository.get_reward_totals_by_referrer({ referrer_user_id: user_id }),
        referralRepository.count_spam_by_referrer({ referrer_user_id: user_id })
    ])

    const totals = { SVE: 0, XP: 0, GEMS: 0, TOKENS: 0, SPINS: 0 }

    for (const row of reward_totals) {
        totals[row._id] = row.total
    }


    return {
        referralCode: referral_code,
        referralLink: `${env.frontendUrl}/register?ref=${referral_code}`,
        totalReferrals: referrals.length,
        successfulReferrals: referrals.filter(r => r.status === "SUCCESSFUL").length,
        pendingReferrals: referrals.filter(r => r.status === "PENDING").length,
        spamReferrals: spam_count,
        totalSvesEarned: totals.SVE,
        totalXpEarned: totals.XP,
        totalGemsEarned: totals.GEMS,
        totalTokensEarned: totals.TOKENS,
        totalSpinsEarned: totals.SPINS,
        recentReferrals: referrals.map(r => ({
            id: r._id,
            status: r.status,
            adsWatched: r.eligible_ads_watched,
            createdAt: r.createdAt,
            completedAt: r.completed_at
        }))
    }

}

async function list_referrals({ user_id, page, limit, status }) {
    return referralRepository.get_referrals_by_referrer(user_id, { page, limit, status })
}

async function spam_summary({ user_id }) {
    const [spam_count, recent_spam] = await Promise.all([
        referralRepository.count_spam_by_referrer({ referrer_user_id: user_id }),
        referralRepository.get_recent_spam_by_referrer({ referrer_user_id: user_id })
    ])

    return { spam_count, recent_spam: recent_spam.map(s => ({ date: s.createdAt })) }
}

async function code_exists({ code }) {
    const owner = await referralRepository.get_user_by_code({ code })
    return { valid: !!owner }
}

export default {
    attribute_referral,
    dashboard,
    list_referrals,
    spam_summary,
    code_exists
}
