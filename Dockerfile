FROM nginx:1.23.0

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y git curl

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN                                                                       \
  apt-get install -y                                                      \
  libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3    \
  libxss1 libasound2 libxtst6 xauth xvfb g++ make

WORKDIR /src/build-your-own-radar
COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY . ./

# Install entrypoint that will source .env (if present) and exec the start command.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Override parent node image's entrypoint and keep a simple CMD for the start script.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["./build_and_start_nginx.sh"]
