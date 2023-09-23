FROM node:19-alpine3.16
#RUN apk update && apk upgrade

RUN mkdir /app

COPY appender /app/appender
COPY builder /app/builder
COPY drivers /app/drivers
COPY lib /app/lib
COPY stores /app/stores
COPY utility /app/utility
COPY node_modules /app/node_modules
COPY package.json /app/package.json

WORKDIR /app
#RUN yarn install
# RUN ls /app
# RUN ls /
# CMD ["yarn","builder"]
ENTRYPOINT [ "yarn" ]
EXPOSE 80
