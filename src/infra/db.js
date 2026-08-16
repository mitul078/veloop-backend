import mongoose from "mongoose";
import env from "../shared/config/env.js";
import logger from "../shared/logs/logger.js";

async function connectDB() {
    try {

        await mongoose.connect(env.db.mongodb_uri)
        logger.info("DATABASE CONNECTED")

    } catch (error) {
        logger.error("DATABASE CONNECTION FAILED", { error: error.message })
        process.exit(1)

    }
}

export default connectDB