import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { enableRo } from "../utils/ro"
import { ensureChatAdmin, isMediaMessage, isBotCommand } from "../utils/validators"

const MODULE = "AUTO_RO"
const SET_AUTO_RO_COMMAND="set_auto_ro_message_count"
const MEDIA_GROUP_ID_KEY = "media_group_id"
const NUMBER_OF_MESSAGES_KEY = "number_of_messages"

function getNumberOfMessages(ctx: Context): Promise<number> {
    return ctx.storage.getConfigValue(String(ctx.chat!.id), MODULE, NUMBER_OF_MESSAGES_KEY)
}

function setNumberOfMessages(ctx: Context, number: number): Promise<void> {
    return ctx.storage.setConfigValue(String(ctx.chat!.id), MODULE, NUMBER_OF_MESSAGES_KEY, number)
}

async function newMediaMessage(ctx: Context, mediaGroupId: string, count: number): Promise<boolean> {
    const groupId = await ctx.storage.getValues(String(ctx.chat!.id), MODULE, [MEDIA_GROUP_ID_KEY])
        .then(groups => groups[0] ?? '')
    if (groupId == mediaGroupId && mediaGroupId != '') {
        return false
    }
    await ctx.storage.setValues(String(ctx.chat!.id), MODULE, { [MEDIA_GROUP_ID_KEY]: mediaGroupId }, 86400)
    const current = await ctx.storage.incValue(String(ctx.chat!.id), MODULE, NUMBER_OF_MESSAGES_KEY, 1)
    return current >= count
}

function newNonMediaMessage(ctx: Context): Promise<void> {
    return ctx.storage.setValues(
        String(ctx.chat!.id), MODULE,
        { [NUMBER_OF_MESSAGES_KEY]: '0', [MEDIA_GROUP_ID_KEY]: '' },
        86400
    )
}

async function command_setNumberOfMessages(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.message.from)) return

    const index = ctx.message.text.indexOf(ctx.botInfo.username) + ctx.botInfo.username.length
    const substr = ctx.message.text.substring(index)
    const number = parseInt(substr, 10)
    
    if (isNaN(number) || number < 0) {
        await ctx.reply(
            'Щось неправильно введено, спробуй ще раз, на цей раз цифрами',
            { reply_to_message_id: ctx.message.message_id }
        )
        return
    }

    await setNumberOfMessages(ctx, number)

    const response: string = number == 0
        ? "АвтоРО вимкнено!"
        : `АвтоРО увімкнено й для нього треба ${number} медіа-повідомлень підряд`

    await ctx.reply(
        response,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function event_onMessage(ctx: MatchedContext<Context, 'message'>): Promise<void> {
    const count = await getNumberOfMessages(ctx)
    if (count <= 0) return // disabled for this chat

    const { isMedia, mediaGroupId } = isMediaMessage(ctx.message)
    if (isMedia) {
        if (await newMediaMessage(ctx, mediaGroupId ?? '', count)) {
            await enableRo(
                ctx, ctx.message.from.id, 86400,
                ctx.message.message_id, ctx.message.from.first_name,
                `за ${count} або більше медіа підряд`
            )
        }
    } else {
        await newNonMediaMessage(ctx)
    }
}


export function register(bot: Telegraf<Context>) {
    bot.command(SET_AUTO_RO_COMMAND, command_setNumberOfMessages)
    bot.on('message', event_onMessage)
}