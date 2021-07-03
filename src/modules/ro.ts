import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { disableRo, enableRo } from "../utils/ro"

const RO_24H_COMMAND = "ro_24h"
const RO_7D_COMMAND = "ro_7d"
const UNRO_COMMAND = "unro"

async function command_ro_7d(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await enableRo(
        ctx.telegram, ctx.storage, String(ctx.chat.id),
        ctx.message.reply_to_message!.from!.id, 86400 * 7,
        ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
    )
}

async function command_ro_24h(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await enableRo(
        ctx.telegram, ctx.storage, String(ctx.chat.id),
        ctx.message.reply_to_message!.from!.id, 86400,
        ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name, ''
    )
}

async function command_unro(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await disableRo(
        ctx.telegram, String(ctx.chat.id),
        ctx.message.reply_to_message!.from!.id, 
        ctx.message.message_id, ctx.message.reply_to_message!.from!.first_name
    )
}

export function register(bot: Telegraf<Context>) {
    bot.command(RO_7D_COMMAND, command_ro_7d)
    bot.command(RO_24H_COMMAND, command_ro_24h)
    bot.command(UNRO_COMMAND, command_unro)
}