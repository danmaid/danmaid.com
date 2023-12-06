FROM node:lts

WORKDIR /usr/local/app
COPY ./package.json ./package-lock.json ./tsconfig.json ./
RUN npm install
COPY ./src/ ./src/
COPY ./public/ ./public/
RUN npm run build
VOLUME [ "/usr/local/app/public" ]
