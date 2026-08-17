import { Router } from "express"
import authController from "./auth.controller.js"
import validate from "../../shared/middlewares/validate.middleware.js"
import authValidation from "./auth.validation.js"
const router = Router()

router.post("/register", validate(authValidation.register_schema), authController.register)
router.post("/login", validate(authValidation.login_schema), authController.login)
router.post("/refresh-token", authController.rotate_token)
router.post("/logout", authController.logout)

export default router