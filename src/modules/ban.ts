import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { isBotCommand, ensureChatAdmin, ensureMessageCitation } from "../utils/validators"
import { banUser, unbanUser } from "../utils/ban"

const BAN_COMMAND = "ban"
const BAN_24H_COMMAND = "ban_24h"
const UNBAN_COMMAND = "unban"

async function command_ban(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await banUser(ctx, ctx.message.reply_to_message!.from!.id, Date.now() / 1000)

    await ctx.reply(
        `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function command_ban_24h(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await banUser(ctx, ctx.message.reply_to_message!.from!.id, Date.now() / 1000 + 86400)

    await ctx.reply(
        `Користувач ${ctx.message.reply_to_message!.from!.first_name} полетів у бан на 24 години`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function command_unban(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.from)) return
    if (!await ensureMessageCitation(ctx)) return

    await unbanUser(ctx, ctx.message.reply_to_message!.from!.id)

    await ctx.reply(
        `Користувач ${ctx.message.reply_to_message!.from!.first_name} розбанений`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

export function register(bot: Telegraf<Context>) {
    bot.command(BAN_COMMAND, command_ban)
    bot.command(BAN_24H_COMMAND, command_ban_24h)
    bot.command(UNBAN_COMMAND, command_unban)
}