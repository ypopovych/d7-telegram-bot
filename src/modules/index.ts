import { Telegraf } from "telegraf"
import { Context } from "../types"
import { register as ro_voting } from "./ro_voting"
import { register as nuke } from "./nuke"
import { register as auto_ro } from "./auto_ro"
import { register as ban } from "./ban"
import { register as ro } from "./ro"

export function register(bot: Telegraf<Context>) {
    ro_voting(bot)
    auto_ro(bot)
    ban(bot)
    ro(bot)
    nuke(bot)
}