import { Telegraf } from "telegraf"
import { Context, MatchedContext } from "../types"

const NUKE_LIST = [
    { id: "moscow", bText: "до Мацкви", lText: "хуйнуть Мацкву", lat: '55.7542102', lng: '37.620095'},
    { id: "rivne", bText: "у Рівне", lText: "зачинити Рiвненський осередок", lat: '50.619900', lng: '26.251617'},
    { id: "cherkasy", bText: "до Черкас", lText: "Черкасси - файне мiсто", lat: '49.444431', lng: '32.059769'}
]

const NUKE_LIST_COMMAND = "nuke_list"
const NUKE_COMMON_PARAMS = "hob_psi=5&hob_ft=47553&casualties=1&fallout=1&ff=52&psi=20,5,1"
const NUKE_REGEX = new RegExp(/\/nuke_([a-zA-Z_\-\.]+)(@\S+)?/)

function getBombSize() {
    const sizes = [
        10, 20, 50, 100, 150, 280, 350,
        600, 800, 1000, 2000, 5000, 8000,
        100000
    ]
    let bomb_size = getRandomIntInclusive(0, sizes.length-1)
    bomb_size = Math.round(getRandomIntInclusive(sizes[bomb_size]-sizes[bomb_size]*0.02, sizes[bomb_size]+sizes[bomb_size]*0.02))
    return Math.min(bomb_size, 100000)
  }

  function getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min //Включаючи мінімум та максимум
  }

async function command_nukeList(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    const hasName = ctx.message.text.indexOf(ctx.botInfo.username) > 0
    if (!hasName && ctx.chat.type !== "private") return

    let lines = NUKE_LIST.reduce((lines, nuke) => {
        return lines.concat([`    /nuke_${nuke.id}@${ctx.botInfo.username} - ${nuke.lText}`])
    }, ["<b>Бамбiть с вертольота:</b>"])

    await ctx.reply(lines.join('\n'), {reply_to_message_id: ctx.message.message_id})
}

async function event_onMessage(ctx: MatchedContext<Context, 'text'>): Promise<void> {
    const match = NUKE_REGEX.exec(ctx.message.text)
    if (!match) return
    const id = match[1], user = match[2]
    if (user && user != ctx.botInfo.username) return
    if (!user && ctx.chat.type !== "private") return
    const city = NUKE_LIST.find(c => c.id == id)
    if (!city) return
    let zm = 8, text = "(долетіло до Землі)", bomb = getBombSize()
    if (getRandomIntInclusive(0, 1) == 1) {
        zm = 9; text = "(йобнуло у повітрі)"
    }
    const reply = 'Знайшла у шухлядi бiмбу у '
        + bomb + ` кiлотонн, хуйнула ${city.bText}, і <a href = "https://nuclearsecrecy.com/nukemap/?kt=`
        + bomb + '&' + NUKE_COMMON_PARAMS
        + `&lat=${city.lat}&lng=${city.lng}&zm=${zm}`
        + '">ось</a> шо вийшло ' + text
    await ctx.replyWithHTML(reply, {reply_to_message_id: ctx.message.message_id})
}

export function register(bot: Telegraf<Context>) {
    bot.command(NUKE_LIST_COMMAND, command_nukeList)
    bot.on('text', event_onMessage)
}