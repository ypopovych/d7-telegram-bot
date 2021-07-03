import { Context } from "telegraf"
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
        `Користувач ${userName} отримав РО на ${getHoursString(period)}`,
        { reply_to_message_id: messageId }
    ).then()
}