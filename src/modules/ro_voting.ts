import { Telegraf } from "telegraf"
import { TelegrafContext, MatchedContext, MethodConfig, VoteValues } from "../types"
import { Module, ModuleContext } from "../module"
import { ensureChatAdmin, ensureMessageCitation, isBotCommand } from "../utils/validators"
import { getHoursString, getUserNameString } from "../utils/string"
import { enableRo } from "../utils/ro"
import { VotingModule, Poll as BasePoll, Voter } from './voting'

interface RoPoll extends BasePoll {
    type: 'ro_poll'
    userName: string
    userId: number
    messageId: number
    votesCount: number
    period: number
} 

export type Config = {
    number_of_votes: MethodConfig
    set_number_of_votes: MethodConfig
    ro_24h_poll: MethodConfig & { pollTime: number }
}

export interface Context extends ModuleContext {
    bot: Telegraf<TelegrafContext>
}

export class RoVotingModule extends Module<VotingModule, Context, Config> {
    readonly name = "ro_voting"
    static readonly moduleName = "ro_voting"

    private voting!: VotingModule

    readonly POLLS_COMMON_CHATID_KEY = "common_polls"
    readonly NUMBER_OF_VOTES_KEY = "number_of_votes"

    private async command_setNumberOfVotes(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
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

    private async command_getNumberOfVotes(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.number_of_votes)) return
    
        const number = await this.getNumberOfVotes(ctx)
    
        await ctx.reply(
            `Для РО треба ${number} голосів`,
            { reply_to_message_id: ctx.message.message_id }
        )
    }

    private async command_startRo24hPoll(ctx: MatchedContext<TelegrafContext, 'text'>): Promise<void> {
        if (!isBotCommand(ctx, this.config.ro_24h_poll)) return
        if (!await ensureMessageCitation(ctx)) return
        const numberOfVotes = await this.getNumberOfVotes(ctx)
        const name = getUserNameString(ctx.message.reply_to_message!.from!)
        const hours = getHoursString(86400)
        const options = [`Дати РО на ${hours}`, 'Панять і прастіть']

        const poll: RoPoll = {
            type: 'ro_poll',
            message: `Тут пропонують дати РО для ${name} на ${hours}. Потрібно ${numberOfVotes} голосів. Го кнопкодавить!`,
            options,
            userName: name,
            userId: ctx.message.reply_to_message!.from!.id,
            messageId: ctx.message.message_id,
            period: 86400,
            votesCount: numberOfVotes
        }

        await this.voting.startPoll(
            this.name, poll, String(ctx.chat.id), false, this.config.ro_24h_poll.pollTime
        )
    }

    private async handler_onVotingPoll(
        ctx: MatchedContext<TelegrafContext, 'callback_query'>,
        chatId: string, pollId: number, poll: RoPoll, voters: VoteValues<Voter>
    ) {
        if (voters.votes[0].length >= poll.votesCount) { // RO
            await this.voting.stopPoll(chatId, pollId)
            await enableRo(
                ctx.telegram, chatId, poll.userId,
                poll.period, poll.messageId, poll.userName, ''
            ) 
        } else if (voters.votes[1].length >= poll.votesCount) { // No RO
            await this.voting.stopPoll(chatId, pollId)
            await ctx.telegram.sendMessage(
                chatId,
                `Користувач ${poll.userName} може й далі писати`,
                { reply_to_message_id: poll.messageId }
            )
        }
    }

    static readonly defaultConfig: Config = {
        number_of_votes: { shortCall: false },
        set_number_of_votes: { shortCall: false },
        ro_24h_poll: { shortCall: false, pollTime: 86400 }
    }

    init(): void {
        this.voting = this.resolver.get(VotingModule)
        this.voting.register(this.name, "ro_poll", this.handler_onVotingPoll.bind(this))
        this.context.bot.command("number_of_votes", this.command_getNumberOfVotes.bind(this))
        this.context.bot.command("set_number_of_votes", this.command_setNumberOfVotes.bind(this))
        this.context.bot.command("ro_24h_poll", this.command_startRo24hPoll.bind(this))
    }

    deinit(): void {
        this.voting.deregister(this.name, "ro_poll")
    }

    title(): string { return 'Демократія' }
    commands(): Record<string, string> {
        return {
            'number_of_votes': 'переглянути кількість голосів для РО',
            'set_number_of_votes': 'встановити кількість голосів для РО',
            'ro_24h_poll': 'запустити голосування для РО на 24 години'
        }
    }

    // Helpers
    private getNumberOfVotes(ctx: MatchedContext<TelegrafContext, 'message'>): Promise<number> {
        return this.getConfigValue(ctx.chat.id, this.NUMBER_OF_VOTES_KEY)
    }
    
    private setNumberOfVotes(ctx: MatchedContext<TelegrafContext, 'message'>, number: number): Promise<void> {
        return this.setConfigValue(ctx.chat.id, this.NUMBER_OF_VOTES_KEY, number)
    }
}
