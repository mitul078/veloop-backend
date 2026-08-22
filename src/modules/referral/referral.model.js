import mongoose from "mongoose";

const referral_code_schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true, unique: true },
    code: { type: String, required: true, unique: true }
}, { timestamps: true })


const referral_schema = new mongoose.Schema({
    referrer_user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true },
    referred_user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true, unique: true },
    code: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESSFUL", "SPAM", "REJECTED", "FRAUD_REVIEW"], default: "PENDING" },
    completed_at: { type: Date, default: null }
}, { timestamps: true })


const referral_progress_schema = new mongoose.Schema({
    referral: { type: mongoose.Schema.Types.ObjectId, ref: "Referral", required: true, unique: true },
    eligible_ads_watched: { type: Number, default: 0 },
    last_verified_at: { type: Date, default: null }
}, { timestamps: true })


const referral_reward_schema = new mongoose.Schema({
    referral: { type: mongoose.Schema.Types.ObjectId, ref: "Referral", required: true },
    referrer_user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true },
    reward_type: { type: String, enum: ["SVE", "SPINS", "TOKENS", "GEMS", "XP"], required: true },
    reward_amount: { type: Number, required: true },
    milestone: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "CREDITED", "FAILED"], default: "PENDING" },
    credited_at: { type: Date, default: null }
}, { timestamps: true })


const ad_event_schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true },
    provider_event_id: { type: String, required: true, unique: true }
}, { timestamps: true })


const device_account_schema = new mongoose.Schema({
    visitorId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", required: true },
    status: { type: String, default: "active" },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true })

const fraud_attempt_schema = new mongoose.Schema({
    type: { type: String, enum: ["REGISTRATION_BLOCKED", "SELF_REFERRAL_BLOCKED"], required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", default: null },
    referrer_user: { type: mongoose.Schema.Types.ObjectId, ref: "Auth", default: null },
    visitorId: { type: String, required: true },
    reason: { type: String, required: true }
}, { timestamps: true })


//indexing
referral_schema.index({ referrer_user: 1 })
referral_schema.index({ status: 1 })

referral_reward_schema.index({ referral: 1, milestone: 1, reward_type: 1 }, { unique: true })

ad_event_schema.index({ user: 1 })

device_account_schema.index({ visitorId: 1 }, { unique: true })
device_account_schema.index({ userId: 1 })


//exports
export const ReferralCode = mongoose.model("ReferralCode", referral_code_schema)
export const Referral = mongoose.model("Referral", referral_schema)
export const ReferralProgress = mongoose.model("ReferralProgress", referral_progress_schema)
export const ReferralReward = mongoose.model("ReferralReward", referral_reward_schema)
export const AdEvent = mongoose.model("AdEvent", ad_event_schema)
export const DeviceAccount = mongoose.model("DeviceAccount", device_account_schema)
export const FraudAttempt = mongoose.model("FraudAttempt", fraud_attempt_schema)
