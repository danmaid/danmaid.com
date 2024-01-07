FROM node:lts
WORKDIR /app/
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
CMD ["npm", "exec", "ts-node", "src/relay"]
