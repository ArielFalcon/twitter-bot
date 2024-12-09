FROM node:22
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
COPY ./videos /usr/src/app/videos
EXPOSE 3000
CMD ["node", "app.js"]