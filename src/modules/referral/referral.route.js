import { Router } from "express";
import authenticate from "../../shared/middlewares/authenticate.middleware.js";
import referralController from "./referral.controller.js";
import rateLimit from "express-rate-limit";
import validate from "../../shared/middlewares/validate.middleware.js";
import referralValidation from "./referral.validation.js";
import ensure_device_token from "../../shared/middlewares/device.middleware.js";
import {  referral_rate_limiter, validate_code_rate_limiter } from "../../shared/middlewares/rate_limit.middleware.js";

const router = Router()

router.get("/me", authenticate, referralController.get_dashboard)
router.post(
    "/attribute",
    authenticate,
    ensure_device_token,
    referral_rate_limiter,
    validate(referralValidation.attribute_schema),
    referralController.attribute
)

router.get("/", authenticate, validate(referralValidation.list_schema), referralController.list_referrals)
router.get("/spam", authenticate, referralController.spam)
router.get("/reward-config", referralController.get_reward_config)
router.get("/validate-code", validate_code_rate_limiter, referralController.code_exists)


export default router