import referralService from "./referral.service.js";
import ApiResponse from "../../shared/utils/api_response.js";

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
            device_id:req.device_token,
            user_agent:req.headers["user-agent"]
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

        const data= await referralService.spam_summary({user_id:req.user.id})
        return res.status(200).json(new ApiResponse(data , "SPAM SUMMARY FETCHED"))

    } catch (error) {
        next(error)

    }
}

export default {
    get_dashboard,
    attribute,
    list_referrals,
    spam
}