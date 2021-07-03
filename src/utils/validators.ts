import { ChatMember, User } from "typegram"
import { Context } from "telegraf"

export function isAdmin(user: ChatMember) {
    return user.status === "creator"
}

export function isMediaMessage(message: any): { isMedia: boolean, mediaGroupId: string | null } {
    if (message.hasOwnProperty('media_group_id')) {
        return { isMedia: true, mediaGroupId: message.media_group_id }
    }
    const isMedia = message.hasOwnProperty('dice')
        || message.hasOwnProperty('sticker')
        || message.hasOwnProperty('animation')
        || message.hasOwnProperty('photo')
        || message.hasOwnProperty('video')
    return { isMedia, mediaGroupId: null }
}

export function isChatAdmin(ctx: Context, userId: number): Promise<boolean> {
    return ctx
        .getChatAdministrators()  
        .then(admins =>
            !!admins.find(admin => isAdmin(admin) && admin.user.id === userId)
        )
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