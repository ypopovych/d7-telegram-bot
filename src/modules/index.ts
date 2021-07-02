import { Telegraf } from "telegraf"
import { Context } from "../types"
import { register as reg_ro_voting } from "./ro_voting"

export function register(bot: Telegraf<Context>) {
    reg_ro_voting(bot)
}