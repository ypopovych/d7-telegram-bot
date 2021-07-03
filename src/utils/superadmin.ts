import { ChatMember } from "typegram"
import { Telegram } from "telegraf"
import { Storage } from "../types"

const MODULE="admin"
const SUPER_ADMINS_KEY="superadmins"

export function isSuperAdmin(user: ChatMember) {
    return user.status === "creator"
}

export async function getSuperAdmins(telegram: Telegram, storage: Storage, chatId: string): Promise<Array<number>> {
    const saved = await storage.getConfigValue(chatId, MODULE, SUPER_ADMINS_KEY)
    if (saved && saved.length > 0) return saved
    const admins = await telegram.getChatAdministrators(chatId)  
    const superadmin = admins.find(adm => isSuperAdmin(adm))
    if (!superadmin) throw new Error("Superadmin not found in chat: " + chatId)
    const superadmins = [superadmin.user.id]
    await setSuperAdmins(storage, chatId, superadmins)
    return superadmins
}

export function setSuperAdmins(storage: Storage, chatId: string, adminIds: number[]): Promise<void> {
    return storage.setConfigValue(chatId, MODULE, SUPER_ADMINS_KEY, adminIds)
}

export async function addSuperAdmin(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<void> {
    let superadmins = await getSuperAdmins(telegram, storage, chatId)
    if (superadmins.indexOf(userId) >= 0) return
    superadmins.push(userId)
    await setSuperAdmins(storage, chatId, superadmins)
}

export async function removeSuperAdmin(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<void> {
    let superadmins = await getSuperAdmins(telegram, storage, chatId)
    const index = superadmins.indexOf(userId)
    if (index <= 0) return
    superadmins.splice(index, 1)
    await setSuperAdmins(storage, chatId, superadmins)
}