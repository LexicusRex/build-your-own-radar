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

# Make the repo's entrypoint executable inside the image (entrypoint remains in the repo path).
RUN chmod +x /src/build-your-own-radar/entrypoint.sh || true

# Run the entrypoint from the repo path so it is the same when running the baked image
# or when the workspace is bind-mounted at /workspaces during development.
ENTRYPOINT ["/bin/sh", "/src/build-your-own-radar/entrypoint.sh"]
CMD ["./build_and_start_nginx.sh"]
