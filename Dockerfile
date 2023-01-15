FROM node:12-alpine

RUN echo hello!
RUN exit 0
RUN apk update && apk upgrade

RUN mkdir /app

COPY app /app

WORKDIR /app/src
RUN yarn install

CMD ["yarn","run","start"]
EXPOSE 443
