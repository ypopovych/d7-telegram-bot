import { Telegraf, Telegram } from "telegraf"
import { Context, MatchedContext, MethodConfig } from "../types"
import { Module } from "../module"
import { ensureChatAdmin, ensureMessageCitation, isBotCommand } from "../utils/validators"
import { getHoursString } from "../utils/string"
import { enableRo } from "../utils/ro"

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

export interface RoVotingModuleConfig {
    number_of_votes: MethodConfig
    set_number_of_votes: MethodConfig
    ro_24h_poll: MethodConfig & { pollTime: number }
}

export class RoVotingModule extends Module<RoVotingModuleConfig> {
    static readonly moduleName = "ro_voting"

    readonly POLLS_COMMON_CHATID_KEY = "common_polls"
    readonly NUMBER_OF_VOTES_KEY = "number_of_votes"

    private async command_setNumberOfVotes(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.set_number_of_votes)) return
        if (!await ensureChatAdmin(ctx, this.storage, ctx.message.from)) return
    
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
    
        await this.setNumberOfVotes(ctx, number)
    
        await ctx.reply(
            `Тепер для РО треба ${number} голосів`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_getNumberOfVotes(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.number_of_votes)) return
    
        const number = await this.getNumberOfVotes(ctx)
    
        await ctx.reply(
            `Для РО треба ${number} голосів`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_startRo24hPoll(ctx: MatchedContext<Context, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_24h_poll)) return
        if (!await ensureMessageCitation(ctx)) return
        const numberOfVotes = await this.getNumberOfVotes(ctx)
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
            endDate: Date.now() + this.config.ro_24h_poll.pollTime,
            period: 86400,
            chatId: poll.chat.id,
            id: poll.poll.id,
            messageId: poll.message_id,
            votesCount: numberOfVotes
        }
        await this.addPoll(poll.poll.id, pollData)
    }

    private async event_onPoll(ctx: MatchedContext<Context, 'poll'>, next: () => Promise<void>): Promise<void> {
        const pollData = await this.getPoll(ctx.poll.id)
        if (!pollData) return await next()
        if (ctx.poll.is_closed) {
            return await this.removePoll(ctx.poll.id)
        }
        if (pollData.endDate <= Date.now()) {
            await this.stopPoll(ctx.telegram, pollData.chatId, pollData.messageId)
            return await this.removePoll(ctx.poll.id)
        }
        if (ctx.poll.options[0].voter_count >= pollData.votesCount) {
            await this.stopPoll(ctx.telegram, pollData.chatId, pollData.messageId)
            await this.removePoll(ctx.poll.id)
            await enableRo(
                ctx.telegram, this.storage, String(pollData.chatId), pollData.userId,
                pollData.period, pollData.messageId, pollData.userName, ''
            )
        } else if (ctx.poll.options[1].voter_count >= pollData.votesCount) {
            await this.stopPoll(ctx.telegram, pollData.chatId, pollData.messageId)
            await this.removePoll(ctx.poll.id)
            await ctx.telegram.sendMessage(
                pollData.chatId,
                `Користувач ${pollData.userName} може й далі писати`,
                { reply_to_message_id: pollData.messageId }
            )
        }
    }

    static readonly defaultConfig: RoVotingModuleConfig = {
        number_of_votes: { shortCall: false },
        set_number_of_votes: { shortCall: false },
        ro_24h_poll: { shortCall: false, pollTime: 86400 }
    }

    register(bot: Telegraf<Context>): void {
        bot.command("number_of_votes", this.command_getNumberOfVotes.bind(this))
        bot.command("set_number_of_votes", this.command_setNumberOfVotes.bind(this))
        bot.command("ro_24h_poll", this.command_startRo24hPoll.bind(this))
        bot.on('poll', this.event_onPoll.bind(this))
    }

    title(): string { return 'Демократія' }
    commands(): Record<string, string> {
        return {
            'number_of_votes': 'Переглянути кількість голосів для РО',
            'set_number_of_votes': 'Встановити кількість голосів для РО',
            'ro_24h_poll': 'Запустити голосування для РО на 24 години'
        }
    }

    // Helpers
    private getNumberOfVotes(ctx: MatchedContext<Context, 'message'>): Promise<number> {
        return this.getConfigValue(ctx.chat.id, this.NUMBER_OF_VOTES_KEY)
    }
    
    private setNumberOfVotes(ctx: MatchedContext<Context, 'message'>, number: number): Promise<void> {
        return this.setConfigValue(ctx.chat.id, this.NUMBER_OF_VOTES_KEY, number)
    }

    private addPoll(pollId: string, data: PollData): Promise<void> {
        return this.storage.setValues(this.POLLS_COMMON_CHATID_KEY, this.moduleName(), { [pollId]: data })
    }
    
    private getPoll(pollId: string): Promise<PollData | undefined> {
        return this.storage.getValues(this.POLLS_COMMON_CHATID_KEY, this.moduleName(), [pollId])
            .then(vals => vals[0])
    }
    
    private removePoll(pollId: string): Promise<void> {
        return this.storage.removeValues(this.POLLS_COMMON_CHATID_KEY, this.moduleName(), [pollId])
    }
    
    private stopPoll(telegram: Telegram, chatId: number, messageId: number): Promise<void> {
        return telegram.stopPoll(chatId, messageId).then()
    }
}
