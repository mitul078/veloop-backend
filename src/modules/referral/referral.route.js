import { Router } from "express";
import authenticate from "../../shared/middlewares/authenticate.middleware.js";
import referralController from "./referral.controller.js";
import validate from "../../shared/middlewares/validate.middleware.js";
import referralValidation from "./referral.validation.js";
import {  referral_rate_limiter, validate_code_rate_limiter } from "../../shared/middlewares/rate_limit.middleware.js";

const router = Router()

router.get("/me", authenticate, referralController.get_dashboard)
router.post(
    "/attribute",
    authenticate,
    referral_rate_limiter,
    validate(referralValidation.attribute_schema),
    referralController.attribute
)

router.get("/", authenticate, validate(referralValidation.list_schema), referralController.list_referrals)
router.get("/reward-config", referralController.get_reward_config)
router.get("/validate-code", validate_code_rate_limiter, referralController.code_exists)


export default router