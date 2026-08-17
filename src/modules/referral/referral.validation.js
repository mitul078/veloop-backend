import { z } from "zod"

const attribute_schema = z.object({
    body: z.object({
        code: z.string().min(3, "REFERRAL CODE TOO SHORT").max(20, "REFERRAL CODE TOO LONG")
    })
})

const list_schema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(50).optional().default(20),
        status: z.enum(["PENDING", "SUCCESSFUL", "SPAM", "REJECTED", "FRAUD_REVIEW"]).optional()
    })
})


export default { attribute_schema , list_schema }