#!/bin/sh

wget https://github.com/danmaid/danmaid.com/releases/latest/download/danmaid.com.zip
unzip danmaid.com.zip -d ./latest
rsync -av --delete ./latest/ /mnt/danmaid.com/
