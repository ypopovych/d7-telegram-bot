import { ModuleBootstrapper } from "../module"
import { VotingModule } from "./voting"
import { AdminModule } from "./admin"
import { AutoRoModule } from "./auto_ro"
import { BanModule } from "./ban"
import { NukeModule } from "./nuke"
import { RoVotingModule } from "./ro_voting"
import { RoModule } from "./ro"
import { XkcdModule } from "./xkcd"
import { JokeModule } from "./joke"
import { HelpModule } from "./help"

export const MODULES = ModuleBootstrapper
    .empty()
    .module(VotingModule)
    .module(AdminModule)
    .module(AutoRoModule)
    .module(BanModule)
    .module(NukeModule)
    .module(RoVotingModule)
    .module(RoModule)
    .module(XkcdModule)
    .module(JokeModule)
    .module(HelpModule)
