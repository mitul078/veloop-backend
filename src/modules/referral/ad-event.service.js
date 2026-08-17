import { evaluate_milestones } from "./milestone.service.js";
import referralRepository from "./referral.repository.js";

export async function record_ad({ user_id, provider_event_id }) {
    let event;
    try {

        event = await referralRepository.save_ad_event({ user_id, provider_event_id })

    } catch (error) {
        if (error.code === 11000) {
            return { duplicate: true }
        }
        throw error
    }

    const referral = await referralRepository.get_referral_by_referred_user({ referred_user_id: user_id })
    if (!referral) {
        return { duplicate: false, event }
    }
    const progress = await referralRepository.increment_ads_watched({ referral_id: referral._id })
    await evaluate_milestones({ referral_id: referral._id })
    return { duplicate: false, adsWatched: progress.eligible_ads_watched }
}