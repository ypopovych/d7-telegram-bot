import { Module, ModuleContext, NullModule } from "../module"
import { Telegraf, Markup, TelegramError } from "telegraf"
import { CallbackQuery, InlineKeyboardMarkup } from "typegram"
import { TelegrafContext, MatchedContext } from "../types"
import { getUserNameString } from "../utils/string"

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export type Config = {
    repostCooldown: number
}

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

type EditMessageUpdate = {
    chatId: string
    messageId: number
    text?: string
    keyboard: Markup.Markup<InlineKeyboardMarkup>
}

type PollCallback<P> = (
    ctx: MatchedContext<TelegrafContext, 'callback_query'>,
    chatId: string, pollId: number, poll: P, voters: Voter[][]
) => Promise<void>

export class VotingModule extends Module<NullModule, Context, Config> {
    readonly name = "voting"
    static readonly moduleName = "voting"
    static readonly defaultConfig: Config = { repostCooldown: 60 }

    private handlers: Record<string, PollCallback<Poll>> = {}
    private updates: Record<string, EditMessageUpdate> = {}
    private timer?: any

    readonly VOTE_REGEX = new RegExp(/^poll_vote_(?<id>[0-9]+)_(?<option>[0-9+])$/)
    readonly REPOST_REGEX = new RegExp(/^poll_repost_(?<id>[0-9]+)$/)
    readonly LAST_REPOST_DATE_KEY = "last_repost_date"

    init() {
        this.context.bot.on('callback_query', this.event_onCallbackQuery.bind(this))
    }

    deinit(): void {
        if (this.timer !== undefined) {
            clearTimeout(this.timer)
            this.timer = undefined
        }
    }

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

        const pollId = Date.now()

        const message = await this.context.bot.telegram.sendMessage(chatId, poll.message, {
            parse_mode: "HTML",
            ...this.inlineKeyboard(poll.options, pollId)
        })

        const pollData: PollData = {
            poll, anonymous,
            module: mod,
            messageId: message.message_id,
            endDate: Date.now() + (timeout * 1000)
        }
        
        try {
            await this.savePoll(chatId, pollId, pollData)
        } catch(error) {
            await this.context.bot.telegram.deleteMessage(chatId, message.message_id)
            throw error
        }

        return pollId
    }

    async stopPoll(chatId: string, pollId: number) {
        const data = await this.getPoll(chatId, pollId)
        if (!data) return
        await this.removePoll(chatId, pollId, data.poll.options.length)
        this.addStopMessageUpdate(chatId, data.messageId)
    }

    private async event_onCallbackQuery(ctx: MatchedContext<TelegrafContext, 'callback_query'>, next: () => Promise<void>): Promise<void> {
        if (!ctx.callbackQuery.hasOwnProperty("data")) return await next()
        const query = ctx.callbackQuery as CallbackQuery.DataCallbackQuery
        if (query.data.indexOf("poll_") !== 0) return await next()
        if (!query.message) {
            await ctx.answerCbQuery('Помилка! Нема повідомлення')
            return
        }

        let regex: RegExpExecArray | null
        if (regex = this.VOTE_REGEX.exec(query.data)) {
            const pollId = parseInt(regex!.groups!["id"], 10)
            const selected = parseInt(regex!.groups!["option"], 10)
            if (pollId === NaN || selected === NaN) {
                await ctx.answerCbQuery('Помилка! Невірна відповідь голосування')
                return 
            }
            await this.pollVote(ctx, pollId, selected)
        } else if (regex = this.REPOST_REGEX.exec(query.data)) {
            const pollId = parseInt(regex!.groups!["id"], 10)
            if (pollId === NaN) {
                await ctx.answerCbQuery('Помилка! Невірна відповідь голосування')
                return 
            }
            await this.pollRepost(ctx, pollId)
        } else {
            await ctx.answerCbQuery(`Помилка! Невідома команда "${query.data}"`)
        }
    }

    private async pollVote(
        ctx: MatchedContext<TelegrafContext, 'callback_query'>, pollId: number, selected: number
    ): Promise<void> {
        const query = ctx.callbackQuery as CallbackQuery.DataCallbackQuery
        const chatId = String(query.message!.chat.id)
        const poll = await this.getPoll(chatId, pollId)
        if (!poll) {
            await ctx.answerCbQuery('Помилка! Голосування не існує')
            this.addStopMessageUpdate(chatId, query.message!.message_id)
            return
        }

        if (poll.endDate <= Date.now()) {
            await ctx.answerCbQuery('Помилка! Голосування вже закінчилось')
            await this.stopPoll(chatId, pollId)
            return
        }

        if (!this.handlers[poll.module+":"+poll.poll.type]) {
            await ctx.answerCbQuery('Помилка! Невідомий вид голосування')
            await this.stopPoll(chatId, pollId)
            return
        }

        const from = query.from

        if (selected >= poll.poll.options.length) {
            await ctx.answerCbQuery('Помилка! Невідома відповідь на голосування!')
            return
        }

        const voter: Voter = {
            id: from.id,
            username: from.username,
            name: getUserNameString(from)
        }

        const {changed, votes} = await this.context.storage.putVoteValue(
            chatId, this.name, String(pollId),
            voter, selected, poll.poll.options.length
        )

        if (changed) {
            await ctx.answerCbQuery("Ваш голос враховано!")
            
            const results = this.getResultsMessage(poll, votes)

            this.addEditMessageUpdate({
                chatId, messageId: poll.messageId,
                text: results, keyboard: this.inlineKeyboard(poll.poll.options, pollId)
            })
        } else {
            await ctx.answerCbQuery("Ваш голос не змінився!")
        }

        await this.handlers[poll.module+":"+poll.poll.type]!(ctx, chatId, pollId, poll.poll, votes)
    }

    private async pollRepost(
        ctx: MatchedContext<TelegrafContext, 'callback_query'>, pollId: number
    ): Promise<void> {
        const query = ctx.callbackQuery as CallbackQuery.DataCallbackQuery
        const chatId = String(query.message!.chat.id)
        const poll = await this.getPoll(chatId, pollId)
        if (!poll) {
            await ctx.answerCbQuery('Помилка! Голосування не існує')
            this.addStopMessageUpdate(chatId, query.message!.message_id)
            return
        }

        if (poll.endDate <= Date.now()) {
            await ctx.answerCbQuery('Помилка! Голосування вже закінчилось')
            await this.stopPoll(chatId, pollId)
            return
        }

        if (!this.handlers[poll.module+":"+poll.poll.type]) {
            await ctx.answerCbQuery('Помилка! Невідомий вид голосування')
            await this.stopPoll(chatId, pollId)
            return
        }

        if (!await this.ensureRepostCooldown(chatId)) {
            await ctx.answerCbQuery('Помилка! Не можна перепостити настільки часто')
            return
        }

        await this.updateRepostCooldown(chatId)

        const votes = await this.context.storage.getVoteValues<Voter>(
            chatId, this.name, String(pollId), poll.poll.options.length
        )
        const results = this.getResultsMessage(poll, votes)

        const message = await this.context.bot.telegram.sendMessage(chatId, results, {
            parse_mode: "HTML",
            ...this.inlineKeyboard(poll.poll.options, pollId)
        })

        const oldMessageId = poll.messageId 
        poll.messageId = message.message_id
        
        try {
            await this.savePoll(chatId, pollId, poll)
            this.clearEditMessageUpdate(chatId, oldMessageId)
        } catch(error) {
            await this.context.bot.telegram.deleteMessage(chatId, message.message_id)
            throw error
        }
        await ctx.telegram.deleteMessage(chatId, oldMessageId)
    }

    title(): string { return "" }
    commands(): Record<string, string> { return {} }

    private getResultsMessage(poll: PollData, votes: Voter[][]) {
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
                    return acc.concat(`<i>${vote.name}</i>`)
                }, [] as string[]).join(", ")
            }
            return val.concat(line)
        }, [] as string[])

        results += options.join(poll.anonymous ? "\n" : "\n\n")
        results += "\n============="
        return results
    }

    private addStopMessageUpdate(chatId: string, messageId: number) {
        const pendingUpdate = this.getEditMessageUpdate(chatId, messageId)
        if (pendingUpdate) {
            pendingUpdate.keyboard = Markup.inlineKeyboard([])
            this.addEditMessageUpdate(pendingUpdate)
        } else {
            this.addEditMessageUpdate({
                chatId, messageId: messageId,
                keyboard: Markup.inlineKeyboard([])
            })
        }
    }

    private addEditMessageUpdate(upd: EditMessageUpdate) {
        this.updates[`${upd.chatId}_${upd.messageId}`] = upd
        if (this.timer === undefined) {
            this.timer = setTimeout(this.updateTimerTick.bind(this), 1000)
        }
    }

    private getEditMessageUpdate(chatId: string, messageId: number) {
        return this.updates[`${chatId}_${messageId}`]
    }

    private clearEditMessageUpdate(chatId: string, messageId: number) {
        delete this.updates[`${chatId}_${messageId}`]
    }

    private async updateTimerTick() {
        const update = Object.values(this.updates).shift()
        if (!update) {
            this.timer = undefined
            return
        }
        let timeout = 1000
        try {
            if (update.text !== undefined) {
                await this.context.bot.telegram.editMessageText(
                    update.chatId, update.messageId, undefined, update.text,
                    { parse_mode: "HTML", ...update.keyboard }
                )
            } else {
                await this.context.bot.telegram.editMessageReplyMarkup(
                    update.chatId, update.messageId, undefined, update.keyboard.reply_markup
                )
            }
            this.clearEditMessageUpdate(update.chatId, update.messageId)
        } catch(err: any) {
            if (err.hasOwnProperty("response") && err.hasOwnProperty("on")) {
                const error = err as TelegramError
                if (error.code === 429) {
                    timeout = (error.parameters?.retry_after ?? 1) * 1000 + 1000
                } else {
                    this.clearEditMessageUpdate(update.chatId, update.messageId)
                    console.error("Failed update:", update, ":ERROR:", err)
                }
            } else {
                this.clearEditMessageUpdate(update.chatId, update.messageId)
                console.error("Failed update:", update, ":ERROR:", err)
            }
        }
        if (Object.values(this.updates).length > 0) {
            this.timer = setTimeout(this.updateTimerTick.bind(this), timeout)
        } else {
            this.timer = undefined
        }
    }

    private async ensureRepostCooldown(chatId: string): Promise<boolean> {
        const cooldown = this.config.repostCooldown
        const lastMessage = await this.storage
            .getValues(chatId, this.name, [this.LAST_REPOST_DATE_KEY])
            .then((vals) => vals[0] ?? 0)
        return (Date.now() - lastMessage) >= (cooldown * 1000)
    }

    private updateRepostCooldown(chatId: string): Promise<void> {
        return this.storage.setValues(
            chatId, this.name,
            { [this.LAST_REPOST_DATE_KEY]: Date.now() }
        )
    }

    private getPoll(chatId: string, pollId: number): Promise<PollData | undefined> {
        return this.context.storage.getValues(chatId, this.name, [String(pollId)])
            .then(vals => vals[0])
    }

    private inlineKeyboard(options: string[], pollId: number) {
        const buttons = options.map((opt, index) => {
            return Markup.button.callback(opt, `poll_vote_${pollId}_${index}`)
        })
        buttons.push(Markup.button.callback("\u2935 Перепостити", `poll_repost_${pollId}`))
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