FROM node:18-alpine

# Install OpenSSL for Prisma compatibility
RUN apk -U upgrade && apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

RUN npm run build


EXPOSE 5000
CMD ["npm", "run", "start"]
