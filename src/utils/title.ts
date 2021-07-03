import { Telegram } from "telegraf"
import { Storage } from "../types"
import { delay } from "./delay"

const MODULE = "title"
const TITLES_KEY = "titles"

export async function setTitle(telegram: Telegram, storage: Storage, chatId: string, userId: number, title: string): Promise<void> {
    await telegram.promoteChatMember(chatId, userId, { can_invite_users: true })
    await delay(2000) // wait 2s
    await telegram.setChatAdministratorCustomTitle(chatId, userId, title)
    let titles: Record<number, string> = await storage.getConfigValue(chatId, MODULE, TITLES_KEY) ?? {}
    titles[userId] = title
    await storage.setConfigValue(chatId, MODULE, TITLES_KEY, titles)
}

export async function restoreTitle(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<void> {
    let titles: Record<number, string> = await storage.getConfigValue(chatId, MODULE, TITLES_KEY) ?? {}
    const title = titles[userId]
    if (title) {
        await telegram.promoteChatMember(chatId, userId, { can_invite_users: true })
        await delay(2000) // wait 2s
        await telegram.setChatAdministratorCustomTitle(chatId, userId, title)
    }
}