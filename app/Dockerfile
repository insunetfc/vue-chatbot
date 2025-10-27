FROM node:22-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i --omit=dev
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]