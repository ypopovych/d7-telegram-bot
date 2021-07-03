import { User } from "typegram"
import { Context } from "../types"
import { getSuperAdmins } from "./superadmin"

const BOT_USERNAME_REGEX = new RegExp(/\/([a-zA-Z_\-\.]+)(@\S+)?/)

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

export function isBotCommand(ctx: Context): boolean {
    if (ctx.message?.chat?.type == "private") return true
    if (!ctx.message && !(ctx.message as any).text) return false
    const match = BOT_USERNAME_REGEX.exec((ctx.message as any).text)
    return !!match && match[2] == '@' + ctx.botInfo.username
}

export function isGroupChat(ctx: Context): boolean {
    return (ctx.chat?.type.indexOf("group") ?? -1) >= 0
}

export async function isChatAdmin(ctx: Context, userId: number): Promise<boolean> {
    const superadmins = await getSuperAdmins(ctx)
    return superadmins.indexOf(userId) >= 0
}

export async function ensureGroupChat(ctx: Context): Promise<boolean> {
    if (!isGroupChat(ctx)) {
        await ctx.reply(
            "Ця команда працює тільки у групових чатах",
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}

export async function ensureChatAdmin(ctx: Context, user: User): Promise<boolean> {
    if (!await ensureGroupChat(ctx)) return false
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