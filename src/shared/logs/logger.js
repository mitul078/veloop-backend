import winston from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format

const isProd = process.env.NODE_ENV === "production"

const dev_format = combine(
    colorize(),
    timestamp({ format: "HH:mm:ss" }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level}]: ${stack || message}`
    })
)

const prod_format = combine(
    timestamp(),
    errors({ stack: true }),
    json()
)

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    level: isProd ? "info" : "debug",
    format: isProd ? prod_format : dev_format,
    transports: [new winston.transports.Console()]
})

export default logger