function mask_email(email) {
    const [local, domain] = email.split("@")
    if (!domain) return "***"

    if (local.length <= 6) {
        const visible = local.slice(0, 2)
        return `${visible}***@${domain}`
    }

    const first4 = local.slice(0, 4)
    const last3 = local.slice(-3)
    return `${first4}***${last3}@${domain}`
}

export default mask_email