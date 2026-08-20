import mongoose from "mongoose";

const auth_schema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false, required: true, },
    verified: { type: Boolean, default: false }

}, { timestamps: true })


const refresh_token = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true },
    refresh_token: { type: String, required: true },
    revoked: { type: Boolean, default: false },
    session_id: { type: String, required: true },
    expires_at: { type: Date, required: true }
})

refresh_token.index({ refresh_token: 1 })
refresh_token.index({ session_id: 1 })
refresh_token.index({ expires_at: 1 }, { expireAfterSeconds: 0 })

export const Auth = mongoose.model("Auth", auth_schema)
export const RefreshToken = mongoose.model("RefreshToken", refresh_token)
