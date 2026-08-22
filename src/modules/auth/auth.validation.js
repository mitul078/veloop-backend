import { z } from "zod"

const register_schema = z.object({
    body: z.object({
        email: z.string().email("INVALID EMAIL FORMAT"),
        password: z.string().min(8, "PASSWORD MUST BE AT LEAST 8 CHARACTERS").max(72, "PASSWORD TOO LONG"),
        phone: z.string().regex(/^\+?[0-9]{7,15}$/, "INVALID PHONE FORMAT").optional(),
        requestId: z.string().min(1, "DEVICE VERIFICATION REQUIRED")
    })
})

const login_schema = z.object({
    body: z.object({
        email: z.string().email("INVALID EMAIL FORMAT"),
        password: z.string().min(1, "PASSWORD REQUIRED")
    })
})

export default {
    register_schema,
    login_schema
}