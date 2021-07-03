import { ChatMember } from "typegram"
import { Context } from "../types"

const MODULE="admin"
const SUPER_ADMINS_KEY="superadmins"

export function isSuperAdmin(user: ChatMember) {
    return user.status === "creator"
}

export async function getSuperAdmins(ctx: Context): Promise<Array<number>> {
    const saved = await ctx.storage.getConfigValue(String(ctx.chat!.id), MODULE, SUPER_ADMINS_KEY)
    if (saved && saved.length > 0) return saved
    const admins = await ctx.getChatAdministrators()  
    const superadmin = admins.find(adm => isSuperAdmin(adm))
    if (!superadmin) throw new Error("Superadmin not found in chat: " + ctx.chat!.id)
    const superadmins = [superadmin.user.id]
    await setSuperAdmins(ctx, superadmins)
    return superadmins
}

export function setSuperAdmins(ctx: Context, adminIds: number[]): Promise<void> {
    return ctx.storage.setConfigValue(String(ctx.chat!.id), MODULE, SUPER_ADMINS_KEY, adminIds)
}

export async function addSuperAdmin(ctx: Context, userId: number): Promise<void> {
    let superadmins = await getSuperAdmins(ctx)
    if (superadmins.indexOf(userId) >= 0) return
    superadmins.push(userId)
    await setSuperAdmins(ctx, superadmins)
}

export async function removeSuperAdmin(ctx: Context, userId: number): Promise<void> {
    let superadmins = await getSuperAdmins(ctx)
    const index = superadmins.indexOf(userId)
    if (index <= 0) return
    superadmins.splice(index, 1)
    await setSuperAdmins(ctx, superadmins)
}