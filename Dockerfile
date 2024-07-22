FROM node:22.3.0-alpine3.20 as api_build

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

RUN npm install -g @nestjs/cli

WORKDIR /build

COPY api/ .

RUN mkdir media && mkdir media/.config

RUN npm i && \
    npm run build && \
    npm run db:push




FROM node:22.3.0-alpine3.20 as client_build

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

RUN apk update && apk add git

WORKDIR /build

COPY client/ .git .

RUN npm i && \
    npm run build




FROM node:22.3.0-alpine3.20

ENV NODE_ENV=production

WORKDIR /app

RUN apk update && apk add ffmpeg

COPY --from=api_build /build/dist dist
COPY --from=api_build /build/node_modules node_modules
COPY --from=api_build /build/media/.config/data.db shema.db
COPY --from=client_build /build/dist client

ENTRYPOINT ["node", "dist/src/main"]
