FROM debian
WORKDIR ~
RUN apt update
RUN apt install -y rsync
COPY sync.sh ./
CMD ["./sync.sh"]
