import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"
import { ensureChatAdmin, ensureMessageCitation, isBotCommand } from "../utils/validators"
import { getHoursString } from "../utils/string"
import { enableRo } from "../utils/ro"

const MODULE = "RO_VOTING"
const POLLS_COMMON_CHATID = "common_polls"
const SET_NUMBER_OF_VOTES_COMMAND = "set_number_of_votes"
const START_RO_POLL_COMMAND = "ro_24h_poll"
const NUMBER_OF_VOTES_KEY = "number_of_votes"

type PollData = {
    userName: string
    userId: number
    chatId: number
    id: string
    messageId: number
    votesCount: number
    period: number
    endDate: number
}

function getNumberOfVotes(ctx: Context): Promise<number> {
    return ctx.storage.getConfigValue(String(ctx.chat!.id), MODULE, NUMBER_OF_VOTES_KEY)
}

function setNumberOfVotes(ctx: Context, number: number): Promise<void> {
    return ctx.storage.setConfigValue(String(ctx.chat!.id), MODULE, NUMBER_OF_VOTES_KEY, number)
}

function addPoll(ctx: MatchedContext<Context, 'text'>, pollId: string, data: PollData): Promise<void> {
    return ctx.storage.setValues(POLLS_COMMON_CHATID, MODULE, { [pollId]: data })
}

function getPoll(ctx: MatchedContext<Context, 'text' | 'poll'>, pollId: string): Promise<PollData | undefined> {
    return ctx.storage.getValues(POLLS_COMMON_CHATID, MODULE, [pollId]).then(vals => vals[0])
}

function removePoll(ctx: MatchedContext<Context, 'text' | 'poll'>, pollId: string): Promise<void> {
    return ctx.storage.removeValues(POLLS_COMMON_CHATID, MODULE, [pollId])
}

async function command_setNumberOfVotes(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    if (!isBotCommand(ctx)) return
    if (!await ensureChatAdmin(ctx, ctx.message.from)) return

    const index = ctx.message.text.indexOf(ctx.botInfo.username) + ctx.botInfo.username.length
    const substr = ctx.message.text.substring(index)
    const number = parseInt(substr, 10)
    
    if (isNaN(number) || number <= 0) {
        await ctx.reply(
            'Щось неправильно введено, спробуй ще раз, на цей раз цифрами',
            { reply_to_message_id: ctx.message.message_id }
        )
        return
    }

    await setNumberOfVotes(ctx, number)

    await ctx.reply(
        `Тепер для РО треба ${number} голосів`,
        { reply_to_message_id: ctx.message.message_id }
    )
}

async function command_startRo24hPoll(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    console.log("MESSAGE", ctx.message)
    if (!isBotCommand(ctx)) return
    if (!await ensureMessageCitation(ctx)) return
    const numberOfVotes = await getNumberOfVotes(ctx)
    const name = ctx.message.reply_to_message!.from!.first_name
    const hours = getHoursString(86400)
    const options = [`Дати РО на ${hours}`, 'Панять і прастіть']
    const poll = await ctx.replyWithPoll(
        `Тут пропонують дати РО для ${name} на ${hours}. Потрібно ${numberOfVotes} голосів. Го кнопкодавить!`,
        options,
        { is_anonymous: false}
    )
    const pollData: PollData = {
        userName: name,
        userId: ctx.message.reply_to_message!.from!.id,
        endDate: Date.now() + 86400,
        period: 86400,
        chatId: ctx.chat.id,
        id: poll.poll.id,
        messageId: poll.message_id,
        votesCount: numberOfVotes
    }
    await addPoll(ctx, poll.poll.id, pollData)
}

async function event_onPoll(ctx: MatchedContext<Context, 'poll'>, next: () => Promise<void>): Promise<void> {
    const pollData = await getPoll(ctx, ctx.poll.id)
    if (!pollData) return await next()
    if (ctx.poll.is_closed) {
        return await removePoll(ctx, ctx.poll.id)
    }
    if (pollData.endDate <= Date.now()) {
        await ctx.stopPoll(pollData.messageId)
        return await removePoll(ctx, ctx.poll.id)
    }
    if (ctx.poll.options[0].voter_count >= pollData.votesCount) {
        await ctx.stopPoll(pollData.messageId)
        await removePoll(ctx, ctx.poll.id)
        await enableRo(
            ctx.telegram, ctx.storage, String(pollData.chatId), pollData.userId,
            pollData.period, pollData.messageId, pollData.userName, ''
        )
    } else if (ctx.poll.options[1].voter_count >= pollData.votesCount) {
        await ctx.stopPoll(pollData.messageId)
        await removePoll(ctx, ctx.poll.id)
        await ctx.reply(
            `Користувач ${pollData.userName} може й далі писати`,
            { reply_to_message_id: pollData.messageId }
        )
    }
}

export function register(bot: Telegraf<Context>) {
    bot.command(SET_NUMBER_OF_VOTES_COMMAND, command_setNumberOfVotes)
    bot.command(START_RO_POLL_COMMAND, command_startRo24hPoll)
    bot.on('poll', event_onPoll)
}