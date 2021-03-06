FROM node:lts-alpine

LABEL maintainer "Yehor Popovych <popovych.yegor@gmail.com>"

ARG CONFIG_FILE="/config/bot-config.json"
ENV CONFIG_FILE=${CONFIG_FILE}

ADD dist /app/dist
ADD package.json jokes.json /app/

RUN cd /app && npm install --production

WORKDIR /app

ENTRYPOINT [ "/usr/local/bin/node", "--unhandled-rejections=strict", "dist/index.js" ]

EXPOSE 8000 8443

VOLUME "/config"
