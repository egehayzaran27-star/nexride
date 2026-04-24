FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# server.js dosyasını izlemek için node --watch kullanıyoruz
CMD ["node", "--watch", "server.js"]
