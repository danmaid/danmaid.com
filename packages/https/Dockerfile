FROM node:lts AS builder
WORKDIR /usr/local/app/
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build

FROM node:lts
WORKDIR /usr/local/app/
COPY package.json package-lock.json ./
RUN npm install --production
COPY --from=builder /usr/local/app/lib/ ./lib/
RUN mkdir data
CMD [ "npm", "start" ]
EXPOSE 80
EXPOSE 443
VOLUME [ "/usr/local/app/data" ]
