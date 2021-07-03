import { ChatMemberRestricted } from "typegram"
import { Context } from "../types"
import { isChatAdmin } from './validators'
import { getHoursString } from './string'

export async function enableRo(
    ctx: Context, userId: number, period: number, messageId: number, userName: string, reason: string
): Promise<void> {
    if (await isChatAdmin(ctx, userId)) {
        return await ctx.reply(
            `Користувач ${userName} суперадмін, я не буду його РОшити`,
            { reply_to_message_id: messageId }
        ).then()
    }
    const user = await ctx.getChatMember(userId)
    if (user.status == 'kicked') {
        return await ctx.reply(
            `Я б заРОшила ${userName}, але він у бані`,
            { reply_to_message_id: messageId }
        ).then()
    }
    await ctx.restrictChatMember(userId, {
        until_date: Math.floor(Date.now() / 1000) + period,
        permissions: { can_send_messages: false }
    })
    return await ctx.reply(
        `Користувач ${userName} отримав РО на ${getHoursString(period)} ${reason}`,
        { reply_to_message_id: messageId }
    ).then()
}


export async function disableRo(ctx: Context, userId: number, messageId: number, userName: string): Promise<void> {
    const user = await ctx.getChatMember(userId)
    if (user.status == 'kicked') {
        return await ctx.reply(
            `Користувач ${userName} в бані`,
            { reply_to_message_id: messageId }
        ).then()
    }
    if (user.status == 'member') {
        return await ctx.reply(
            `Користувач ${userName} не у РО`,
            { reply_to_message_id: messageId }
        ).then()
    }
    if (user.status == 'restricted') {
        const rest = user as ChatMemberRestricted
        if (rest.can_send_messages) {
            return await ctx.reply(
                `Користувач ${userName} не у РО`,
                { reply_to_message_id: messageId }
            ).then()
        }
        await ctx.restrictChatMember(
            userId,
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
        await ctx.reply(
            `Користувач ${userName} помилуваний`,
            { reply_to_message_id: messageId }
        )
    }
}