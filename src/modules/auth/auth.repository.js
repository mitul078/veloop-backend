import { Auth, RefreshToken } from "./auth.model.js"

async function create_user({ email, password, phone }) {
    return Auth.create({ email, password, phone })
}

async function get_user({ email }) {
    return Auth.findOne({ email })
}


async function get_user_with_password({ email }) {
    return Auth.findOne({ email }).select("+password")
}

async function get_user_by_id(id) {
    return Auth.findById(id)
}

async function set_verified({ email }) {
    return Auth.findOneAndUpdate({ email }, { verified: true }, { new: true })
}

async function create_refresh_token({ user_id, session_id, expires_at, refresh_token }) {
    return RefreshToken.create({
        user_id,
        session_id,
        expires_at,
        refresh_token
    })
}

async function get_refresh_token({ refresh_token }) {
    return RefreshToken.findOne({ refresh_token })
}

async function revoke_token({ refresh_token }) {
    return RefreshToken.findOneAndUpdate({ refresh_token }, { revoked: true }, { new: true })
}

async function revoke_session({ session_id }) {
    return RefreshToken.updateMany({ session_id }, { $set: { revoked: true } })
}



export default {
    create_user,
    get_user,
    get_user_with_password,
    get_user_by_id,
    set_verified,
    create_refresh_token,
    get_refresh_token,
    revoke_session,
    revoke_token,
    
}