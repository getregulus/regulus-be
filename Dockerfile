FROM node:18-alpine

USER root

RUN apk update && apk add --no-cache dos2unix

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN dos2unix entrypoint.sh

RUN chmod +x /app/entrypoint.sh

RUN npx prisma generate
RUN npm install -g prisma

ENV PORT=3000
EXPOSE 3000 5555

ENTRYPOINT ["/app/entrypoint.sh"]
