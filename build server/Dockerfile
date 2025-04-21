FROM ubuntu:focal
RUN apt-get update && apt-get install -y curl git && curl -sL https://deb.nodesource.com/setup_20.x | bash - && apt-get update && apt-get install -y nodejs
WORKDIR /home/app
COPY . .
RUN npm install && chmod +x main.sh script.js
ENTRYPOINT ["/home/app/main.sh"]
