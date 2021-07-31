import { Telegram } from "telegraf"
import { ChatMemberRestricted } from "typegram"
import { Storage } from "../types"
import { isTelegramChatAdmin } from './validators'
import { getHoursString } from './string'
import { restoreTitle } from './title'


export async function enableRo(
    telegram: Telegram, chatId: string,
    userId: number, period: number, messageId: number,
    userName: string, reason: string
): Promise<void> {
    if (await isTelegramChatAdmin(telegram, chatId, userId)) {
        return await telegram.sendMessage(
            chatId,
            `Користувач ${userName} адмін, я не буду його РОшити`,
            { reply_to_message_id: messageId }
        ).then()
    }
    const user = await telegram.getChatMember(chatId, userId)
    if (user.status == 'kicked') {
        return await telegram.sendMessage(
            chatId,
            `Я б заРОшила ${userName}, але він у бані`,
            { reply_to_message_id: messageId }
        ).then()
    }
    await telegram.restrictChatMember(chatId, userId, {
        until_date: Math.floor(Date.now() / 1000) + period,
        permissions: { can_send_messages: false }
    })
    await telegram.sendMessage(
        chatId,
        `Користувач ${userName} отримав РО на ${getHoursString(period)} ${reason}`,
        { reply_to_message_id: messageId }
    )
}


export async function disableRo(
    telegram: Telegram, storage: Storage, chatId: string,
    userId: number, messageId: number, userName: string
): Promise<void> {
    const user = await telegram.getChatMember(chatId, userId)
    if (user.status == 'kicked') {
        return await telegram.sendMessage(
            chatId,
            `Користувач ${userName} в бані`,
            { reply_to_message_id: messageId }
        ).then()
    }
    if (user.status == 'member') {
        return await telegram.sendMessage(
            chatId,
            `Користувач ${userName} не у РО`,
            { reply_to_message_id: messageId }
        ).then()
    }
    if (user.status == 'restricted') {
        const rest = user as ChatMemberRestricted
        if (rest.can_send_messages) {
            return await telegram.sendMessage(
                chatId,
                `Користувач ${userName} не у РО`,
                { reply_to_message_id: messageId }
            ).then()
        }
        await telegram.restrictChatMember(
            chatId, userId,
            {
                permissions: {
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_polls: true,
                    can_send_other_messages:true,
                    can_add_web_page_previews: true,
                    can_invite_users: true
                },
                until_date: Date.now() / 1000 + 35
            }
        )
        await telegram.sendMessage(
            chatId,
            `Користувач ${userName} помилуваний`,
            { reply_to_message_id: messageId }
        )
        await restoreTitle(telegram, storage, chatId, userId)
    }
}