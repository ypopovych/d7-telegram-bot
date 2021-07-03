# D7 TelegramAdministrator Bot
Telegram Administrator bot for D7 chats

# How to build and run

## Install dependencies
```sh
npm install
```

## Create config
Run npm script and copy JSON to the `config.json` file
```sh
npm run dev-gen-config
```

## Run
Start dev version without compiling with `ts-node`:
```sh
npm run dev
```

## Compile & Run
For performance reasons it's better to compile TypeScript and run JS:
```sh
npm run build && npm start
```

# Licence
Bot can be used, distributed and modified under [the Apache 2.0 license](LICENSE).