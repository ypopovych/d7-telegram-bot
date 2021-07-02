import { ChatMember, User } from "typegram"
import { Context } from "telegraf"

export function isAdmin(user: ChatMember) {
    return user.status === "creator"
}

export function isChatAdmin(ctx: Context, userId: number): Promise<boolean> {
    return ctx
        .getChatAdministrators()  
        .then(admins =>
            !!admins.find(admin => isAdmin(admin) && admin.user.id === userId)
        )
}

export function getHoursString(seconds: number): string {
    const hours = seconds / 3600
    if (hours % 10 == 1 && hours % 100 > 20) {
        return `${hours} годину`
    }
    if (hours % 10 < 5 && hours % 100 > 20) {
        return `${hours} години`
    }
    return `${hours} годин`
}

export async function ensureChatAdmin(ctx: Context, user: User): Promise<boolean> {
    if (!await isChatAdmin(ctx, user.id)) {
        await ctx.reply(
            "Не електрик - не лізь. У тебе немає прав для цього",
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}

export async function ensureMessageCitation(ctx: Context): Promise<boolean> {
    if (!ctx.message?.hasOwnProperty('reply_to_message')) {
        await ctx.reply(
            'Цю функцію можна виконати тільки через цитування',
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}

export async function enableRo(ctx: Context, userId: number, period: number, messageId: number, userName: string): Promise<void> {
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