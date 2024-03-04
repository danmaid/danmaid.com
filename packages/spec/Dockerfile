FROM node

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install --with-deps

EXPOSE 9323

ENTRYPOINT [ "npx" ]
CMD [ "playwright", "test" ]
