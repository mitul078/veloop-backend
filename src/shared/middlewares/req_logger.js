import morgan from "morgan";
import logger from "../logs/logger.js";

const stream = {
    write: (message) => logger.http(message.trim())
}
const format = process.env.NODE_ENV === "production" ? "combined" : "dev"

export const req_logger = morgan(format, { stream })