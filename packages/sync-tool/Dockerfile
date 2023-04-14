FROM alpine
WORKDIR ~
RUN apk add rsync
COPY sync.sh ./
CMD ["./sync.sh"]
