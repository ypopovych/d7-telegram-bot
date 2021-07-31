import { Module, ModuleContext, NullModule } from "../module"
import { Telegraf, Markup } from "telegraf"
import { CallbackQuery } from "typegram"
import { TelegrafContext, MatchedContext } from "../types"
import { getUserNameString } from "../utils/string"
import { isChatMember } from "../utils/validators"

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export type Config = {}

export interface Poll {
    type: string
    message: string
    options: string[]
}

export type Voter = {
    id: number,
    username?: string,
    name: string
}

type PollData = {
    poll: Poll,
    messageId: number
    module: string
    anonymous: boolean
    endDate: number
}

type PollCallback<P> = (
    ctx: MatchedContext<TelegrafContext, 'callback_query'>,
    chatId: string, pollId: number, poll: P, voters: Voter[][]
) => Promise<void>

export class VotingModule extends Module<NullModule, Context, Config> {
    readonly name = "voting"
    static readonly moduleName = "voting"
    static readonly defaultConfig: Config = {}

    private handlers: Record<string, PollCallback<Poll>> = {}

    init() {
        this.context.bot.on('callback_query', this.event_onCallbackQuery.bind(this))
    }

    deinit(): void {}

    register<P extends Poll>(mod: string, type: P['type'], handler: PollCallback<P>) {
        this.handlers[mod+":"+type] = handler as PollCallback<Poll>
    }

    deregister(mod: string, type: string) {
        delete this.handlers[mod+":"+type]
    }

    async startPoll<P extends Poll>(
        mod: string, poll: P, chatId: string, anonymous: boolean, timeout: number
    ): Promise<number> {
        if (!this.handlers[mod+":"+poll.type]) throw new Error(`Unknown poll type ${mod}:${poll}`)

        const message = await this.context.bot.telegram.sendMessage(chatId, poll.message, {
            parse_mode: "HTML",
            ...this.inlineKeyboard(poll.options)
        })

        const pollId = message.message_id

        const pollData: PollData = {
            poll, anonymous,
            module: mod,
            messageId: pollId,
            endDate: Date.now() + (timeout * 1000)
        }
        
        try {
            await this.savePoll(chatId, pollId, pollData)
        } catch(error) {
            await this.context.bot.telegram.deleteMessage(chatId, pollId)
            throw error
        }

        return pollId
    }

    async stopPoll(chatId: string, pollId: number) {
        const data = await this.getPoll(chatId, pollId)
        if (!data) return
        await this.removePoll(chatId, pollId, data.poll.options.length)
        const keyboard = Markup.inlineKeyboard([]).reply_markup
        await this.context.bot.telegram.editMessageReplyMarkup(chatId, pollId, undefined, keyboard)
    }

    private async event_onCallbackQuery(ctx: MatchedContext<TelegrafContext, 'callback_query'>, next: () => Promise<void>) {
        if (!ctx.callbackQuery.hasOwnProperty("data")) return await next()
        const query = ctx.callbackQuery as CallbackQuery.DataCallbackQuery
        if (query.data.indexOf("poll_vote_") !== 0) return await next()
        if (!query.message) return await ctx.answerCbQuery()

        const pollId = query.message.message_id
        const chatId = String(query.message.chat.id)
        const poll = await this.getPoll(chatId, pollId)
        if (!poll) return await ctx.answerCbQuery()

        if (poll.endDate <= Date.now()) {
            await this.stopPoll(chatId, pollId)
            return await ctx.answerCbQuery()
        }

        if (!this.handlers[poll.module+":"+poll.poll.type]) return await ctx.answerCbQuery()

        const from = query.from

        const voteIndex = parseInt(query.data.replace("poll_vote_", ""), 10)
        if (voteIndex === NaN || voteIndex >= poll.poll.options.length) return await ctx.answerCbQuery()

        if (!await isChatMember(ctx.telegram, chatId, from.id)) {
            return await ctx.answerCbQuery("Помилка! Ви не є учасником чату з голосуванням.")
        }

        const voter: Voter = {
            id: from.id,
            username: from.username,
            name: getUserNameString(from)
        }

        const {changed, votes} = await this.context.storage.putVoteValue(
            chatId, this.name, String(pollId),
            voter, voteIndex, poll.poll.options.length
        )

        if (changed) {
            await ctx.answerCbQuery("Ваш голос враховано!")

            let results = poll.poll.message 
            results += "\n\n=============\n"
            results += "Результати:"
            results += "\n=============\n"

            const options = poll.poll.options.reduce((val, opt, idx) => {
                const voters = votes[idx]
                let line = `<b>[${voters.length}]</b> ${opt}`
                if (!poll.anonymous) {
                    line += "<b>:</b> "
                    line += voters.reduce((acc, vote) => {
                        const name = vote.username
                            ? `<i>${vote.name}</i>(@${vote.username})`
                            : `<i>${vote.name}</i>`
                        return acc.concat(name)
                    }, [] as string[]).join(", ")
                }
                return val.concat(line)
            }, [] as string[])
            
            results += options.join("\n")

            results += "\n============="
            
            await ctx.telegram.editMessageText(
                chatId, pollId, undefined, results,
                { parse_mode: "HTML", ...this.inlineKeyboard(poll.poll.options) }
            )
        } else {
            await ctx.answerCbQuery("Ваш голос не змінився!")
        }

        await this.handlers[poll.module+":"+poll.poll.type]!(ctx, chatId, pollId, poll.poll, votes)
    }

    title(): string { return "" }
    commands(): Record<string, string> { return {} }

    private getPoll(chatId: string, pollId: number): Promise<PollData | undefined> {
        return this.context.storage.getValues(chatId, this.name, [String(pollId)])
            .then(vals => vals[0])
    }

    private inlineKeyboard(options: string[]) {
        const buttons = options.map((opt, index) => {
            return Markup.button.callback(opt, "poll_vote_" + index)
        })
        return Markup.inlineKeyboard(buttons)
    }

    private savePoll(chatId: string, pollId: number, pollData: PollData): Promise<void> {
        return this.context.storage.setValues(chatId, this.name, { [String(pollId)]: pollData})
    }

    private async removePoll(chatId: string, pollId: number, options: number): Promise<void> {
        await this.storage.clearVoteValues(chatId, this.name, String(pollId), options)
        await this.storage.removeValues(chatId, this.name, [String(pollId)])
    }
}