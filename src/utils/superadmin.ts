import { Telegram } from "telegraf"
import { Storage } from "../types"

const MODULE="admin"
const SUPER_ADMINS_KEY="superadmins"

export type SuperAdminData = { userId: number; userName?: string }

export async function getSuperAdmins(telegram: Telegram, storage: Storage, chatId: string): Promise<Array<SuperAdminData>> {
    const saved = await storage.getConfigValue(chatId, MODULE, SUPER_ADMINS_KEY)
    if (saved && saved.length > 0) return saved
    const admins = await telegram.getChatAdministrators(chatId)  
    const superadmin = admins.find(adm => adm.status === "creator")
    if (!superadmin) throw new Error("Superadmin not found in chat: " + chatId)
    const superadmins: SuperAdminData[] = [{ userId: superadmin.user.id, userName: superadmin.user.username }]
    await setSuperAdmins(storage, chatId, superadmins)
    return superadmins
}

export function setSuperAdmins(storage: Storage, chatId: string, admins: SuperAdminData[]): Promise<void> {
    return storage.setConfigValue(chatId, MODULE, SUPER_ADMINS_KEY, admins)
}

export async function addSuperAdmin(
    telegram: Telegram, storage: Storage, chatId: string, userId: number, userName?: string
): Promise<void> {
    let superadmins = await getSuperAdmins(telegram, storage, chatId)
    if (superadmins.findIndex(adm => adm.userId == userId) >= 0) return
    superadmins.push({ userId, userName })
    await setSuperAdmins(storage, chatId, superadmins)
}

export async function removeSuperAdmin(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<void> {
    let superadmins = await getSuperAdmins(telegram, storage, chatId)
    const index = superadmins.findIndex(adm => adm.userId == userId)
    if (index <= 0) return
    superadmins.splice(index, 1)
    await setSuperAdmins(storage, chatId, superadmins)
}