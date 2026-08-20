import referralService from "./referral.service.js";
import ApiResponse from "../../shared/utils/api_response.js";
import { MILESTONES, SUCCESSFUL_REFERRAL_XP } from "../../shared/utils/milestone.js"

async function get_dashboard(req, res, next) {
    try {

        const data = await referralService.dashboard({ user_id: req.user.id })
        return res.status(200).json(new ApiResponse(data, "DATA FETCHED"))

    } catch (error) {
        next(error)

    }
}

async function attribute(req, res, next) {
    try {

        const { code } = req.body
        const referral = await referralService.attribute_referral({
            current_user_id: req.user.id,
            code,
            device_id: req.device_token,
            user_agent: req.headers["user-agent"]
        })

        return res.status(201).json(new ApiResponse(referral, "REFERRAL ATTRIBUTED"))

    } catch (error) {
        next(error)

    }
}

async function list_referrals(req, res, next) {
    try {

        const { page, limit, status } = req.query
        const referrals = await referralService.list_referrals({ user_id: req.user.id, page, limit, status })
        return res.status(200).json(new ApiResponse(referrals, "REFERRALS FETCHED"))

    } catch (error) {
        next(error)

    }
}

async function spam(req, res, next) {
    try {

        const data = await referralService.spam_summary({ user_id: req.user.id })
        return res.status(200).json(new ApiResponse(data, "SPAM SUMMARY FETCHED"))

    } catch (error) {
        next(error)

    }
}

async function get_reward_config(req, res, next) {
    try {
        return res.status(200).json(new ApiResponse({ milestones: MILESTONES, successfulReferralXp: SUCCESSFUL_REFERRAL_XP }, "REWARD CONFIG FETCHED"))
    } catch (error) {
        next(error)
    }
}

async function code_exists(req, res, next) {
    try {

        const { code } = req.query
        const result = await referralService.code_exists({ code })
        return res.status(200).json(new ApiResponse(result, "CODE EXISTS"))

    } catch (error) {
        next(error)

    }
}

export default {
    get_dashboard,
    attribute,
    list_referrals,
    spam,
    get_reward_config,
    code_exists
}