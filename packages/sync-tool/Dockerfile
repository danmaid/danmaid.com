FROM debian
WORKDIR ~
RUN apt-get update
RUN apt-get install -y rsync git binutils
RUN git clone https://github.com/aws/efs-utils
RUN cd efs-utils && ./build-deb.sh && apt-get -y install ./build/amazon-efs-utils*deb
COPY sync.sh ./
CMD ["./sync.sh"]
