FROM denoland/deno

WORKDIR /app
COPY ./index.ts ./
RUN deno cache index.ts
CMD ["run", "--allow-env", "--allow-read", "--allow-net", "index.ts"]
VOLUME [ "/app/data" ]
