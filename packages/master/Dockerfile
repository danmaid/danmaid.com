FROM node:lts AS builder
WORKDIR /app/
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build

FROM node:lts
WORKDIR /app/
COPY package.json package-lock.json ./
RUN npm install --production
COPY --from=builder /app/lib/ ./lib/
CMD [ "npm", "start" ]
EXPOSE 443
VOLUME [ "/app/data" ]
