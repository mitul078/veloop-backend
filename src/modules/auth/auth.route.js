import { Router } from "express"
import authController from "./auth.controller.js"
import validate from "../../shared/middlewares/validate.middleware.js"
import authValidation from "./auth.validation.js"
import { auth_rate_limiter } from "../../shared/middlewares/rate_limit.middleware.js"
import ensure_device_token from "../../shared/middlewares/device.middleware.js"
const router = Router()

router.post("/register",ensure_device_token, validate(authValidation.register_schema), authController.register)
router.post("/login", auth_rate_limiter, validate(authValidation.login_schema), authController.login)
router.post("/refresh-token", auth_rate_limiter, authController.rotate_token)
router.post("/logout", authController.logout)

export default router