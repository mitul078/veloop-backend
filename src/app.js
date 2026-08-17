import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import env from "./shared/config/env.js";
import { req_logger } from "./shared/middlewares/req_logger.js";
import { error_handler, not_found_handler } from "./shared/middlewares/error.middleware.js";
import { authRoutes } from "./modules/auth/index.js";

const app = express()

app.use(helmet())
app.use(cors({ origin: env.frontendUrl, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(req_logger)

app.get("/health", (req, res) => {
    res.status(200).json({ success: true, message: "OK" })
})

app.use("/api/v1/auth" , authRoutes)

app.use(not_found_handler)
app.use(error_handler)

export default app