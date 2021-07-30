import { Configuration } from "./config"
import { MODULES } from "./modules"

// generate
const defaultConfig = Configuration.generateDefaultConfig(MODULES.registered())

// print it
console.log(JSON.stringify(defaultConfig, null, 2))