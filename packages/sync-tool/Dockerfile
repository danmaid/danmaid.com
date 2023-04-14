FROM alpine
WORKDIR ~
RUN apk add rsync
COPY sync.sh ./
CMD [ "/bin/sh", "-c", "./sync.sh" ]
