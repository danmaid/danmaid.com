FROM node:18-alpine AS builder
WORKDIR /usr/local/app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build
RUN npm ci --omit=dev

FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /usr/local/app
COPY --from=builder /usr/local/app/package.json ./
COPY --from=builder /usr/local/app/node_modules/ ./node_modules/
COPY --from=builder /usr/local/app/lib/ ./lib/
VOLUME [ "/usr/local/app/public" ]
EXPOSE 3000
CMD [ "node", "lib/serve" ]
