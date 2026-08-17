import { FINAL_MILESTONE_ADS, MILESTONES, SUCCESSFUL_REFERRAL_XP } from "../../shared/utils/milestone.js"
import referralRepository from "./referral.repository.js"

async function credit_reward_once({ referral, milestone, reward_type, amount }) {
    try {
        await referralRepository.save_reward({
            referral_id: referral._id,
            referrer_user: referral.referrer_user,
            reward_type,
            reward_amount: amount,
            milestone
        })
    } catch (error) {
        if (error.code === 11000) return
        throw error
    }
}

export async function evaluate_milestones({ referral_id }) {
    const referral = await referralRepository.get_referral_by_id({ referral_id })
    if (!referral) return

    if (["SPAM", "REJECTED", "FRAUD_REVIEW"].includes(referral.status)) return

    const progress = await referralRepository.get_progress_by_referral({ referral_id })
    if (!progress) return

    const ads = progress.eligible_ads_watched
    const reached = MILESTONES.filter(m => ads >= m.milestone)

    for (const m of reached) {
        await credit_reward_once({
            referral,
            milestone: m.milestone,
            reward_type: m.reward_type,
            amount: m.amount
        })
    }

    if (ads >= FINAL_MILESTONE_ADS && referral.status !== "SUCCESSFUL") {
        await credit_reward_once({
            referral,
            milestone: 0,
            reward_type: "XP",
            amount: SUCCESSFUL_REFERRAL_XP
        })

        await referralRepository.update_referral_status({
            referral_id: referral._id,
            status: "SUCCESSFUL",
            completed_at: new Date()
        })
    }
}
