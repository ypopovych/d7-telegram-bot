import { Telegram } from "telegraf"
import { Storage } from "../types"
import { delay } from "./delay"

const MODULE = "title"
const TITLES_KEY = "titles"

type TitleData = {
    userName?: string
    title: string
}

export async function setTitle(
    telegram: Telegram, storage: Storage, chatId: string,
    userId: number, userName: string | undefined, title: string
): Promise<void> {
    await telegram.promoteChatMember(chatId, userId, { can_invite_users: true })
    await delay(2000) // wait 2s
    await telegram.setChatAdministratorCustomTitle(chatId, userId, title)
    let titles: Record<number, TitleData> = await storage.getConfigValue(chatId, MODULE, TITLES_KEY) ?? {}
    titles[userId] = { title, userName }
    await storage.setConfigValue(chatId, MODULE, TITLES_KEY, titles)
}

export async function restoreTitle(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<void> {
    let titles: Record<number, TitleData> = await storage.getConfigValue(chatId, MODULE, TITLES_KEY) ?? {}
    const titleData = titles[userId]
    if (titleData) {
        await telegram.promoteChatMember(chatId, userId, { can_invite_users: true })
        await delay(2000) // wait 2s
        await telegram.setChatAdministratorCustomTitle(chatId, userId, titleData.title)
    }
}