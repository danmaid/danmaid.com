FROM node:18-alpine AS builder
WORKDIR /usr/local/app
COPY package.json index.html tsconfig.json vite.config.ts tsconfig.lib.json ./
RUN npm install
COPY src/ ./src/
ADD public/ ./public/
RUN npm run build
RUN npm run build:lib
RUN npm ci --omit=dev

FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /usr/local/app
COPY --from=builder /usr/local/app/package.json ./
COPY --from=builder /usr/local/app/node_modules/ ./node_modules/
COPY --from=builder /usr/local/app/lib/ ./lib/
COPY --from=builder /usr/local/app/dist/ ./dist/
EXPOSE 3000
CMD [ "npm", "run", "serve" ]
