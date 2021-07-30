import { Telegram } from "telegraf"
import { User, Chat, Message } from "typegram"
import { TelegrafContext as Context, MatchedContext, MethodConfig, Storage } from "../types"
import { getSuperAdmins } from "./superadmin"

const BOT_USERNAME_REGEX = new RegExp(/\/([a-zA-Z0-9_\-\.]+)(@\S+)?/)

const MEDIA_MESSAGE_PROPERTIES = ['dice', 'sticker', 'animation', 'photo', 'video', 'video_note', 'voice']

export function isMediaMessage(message: Message): { isMedia: boolean, mediaGroupId: string | null } {
    if (message.hasOwnProperty('media_group_id')) {
        return { isMedia: true, mediaGroupId: (message as any).media_group_id }
    }
    const isMedia = MEDIA_MESSAGE_PROPERTIES.reduce(
        (prev, prop) => prev || message.hasOwnProperty(prop),
        false
    )
    return { isMedia, mediaGroupId: null }
}

export function isBotCommand(ctx: MatchedContext<Context, 'message'>, method: MethodConfig): boolean {
    if (ctx.message.chat.type == "private") return true
    if (!(ctx.message as any).text) return false
    const match = BOT_USERNAME_REGEX.exec((ctx.message as any).text)
    if (!match) return false
    if (method.shortCall) return true
    return match[2] == '@' + ctx.botInfo.username
}

export function isGroupChat(chat: Chat): boolean {
    return (chat.type.indexOf("group") ?? -1) >= 0
}

export async function isChatAdmin(telegram: Telegram, storage: Storage, chatId: string, userId: number): Promise<boolean> {
    const superadmins = await getSuperAdmins(telegram, storage, chatId)
    return superadmins.findIndex(adm => adm.userId == userId) >= 0
}

export async function ensureGroupChat(ctx: MatchedContext<Context, 'message'>): Promise<boolean> {
    if (!isGroupChat(ctx.chat)) {
        await ctx.reply(
            "Ця команда працює тільки у групових чатах",
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}

export async function ensureChatAdmin(
    ctx: MatchedContext<Context, 'message'>, storage: Storage, user: User
): Promise<boolean> {
    if (!await ensureGroupChat(ctx)) return false
    if (!await isChatAdmin(ctx.telegram, storage, String(ctx.chat.id), user.id)) {
        await ctx.reply(
            "Не електрик - не лізь. У тебе немає прав для цього",
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}

export async function ensureMessageCitation(ctx: MatchedContext<Context, 'message'>): Promise<boolean> {
    if (!ctx.message?.hasOwnProperty('reply_to_message')) {
        await ctx.reply(
            'Цю функцію можна виконати тільки через цитування',
            { reply_to_message_id: ctx.message!.message_id }
        )
        return false
    }
    return true
}