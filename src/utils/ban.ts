import { Telegram } from "telegraf"

export function banUser(telegram: Telegram, chatId: string, userId: number, until: number): Promise<void> {
    return telegram.kickChatMember(chatId, userId, until).then()
}

export function unbanUser(telegram: Telegram, chatId: string, userId: number): Promise<void> {
    return telegram.unbanChatMember(chatId, userId, { only_if_banned: true }).then()
}