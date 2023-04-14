FROM alpine
WORKDIR ~
RUN apk add rsync
COPY sync.sh ./
RUN chmod +x sync.sh
CMD [ "./sync.sh" ]
