# https://docs.earthly.dev/basics

VERSION 0.8


flake:
  FROM nixos/nix:2.20.4
  WORKDIR /app
  # Enable flakes
  RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf
  COPY flake.nix flake.lock ./
  # install packages from the packages section in flake.nix
  RUN nix profile install --impure -L '.#ci'

app-setup:
  FROM +flake
  WORKDIR /app
  COPY package.json package-lock.json .npmrc ./
  RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp
  COPY --dir other ./
  RUN npx tsx ./other/build-icons.ts
  COPY --dir app server public types ./
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./

app-build:
  BUILD +app-typecheck
  BUILD +app-lint
  FROM +app-setup
  RUN npm run build

app-deploy-litefs:
   FROM flyio/litefs:0.5.10
   SAVE ARTIFACT /usr/local/bin/litefs

app-deploy-image:
  FROM node:21-bookworm-slim

  WORKDIR /myapp

  ENV NODE_ENV production
  ENV FLY="true"


  RUN apt-get update && apt-get install -y fuse3 sqlite3 ca-certificates wget python3 make g++

  # litefs
  ENV LITEFS_DIR="/litefs/data"
  COPY +app-deploy-litefs/litefs /usr/local/bin/litefs
  COPY other/litefs.yml /etc/litefs.yml
  RUN mkdir -p /data ${LITEFS_DIR}


  # GlobalBrain service
  # Julie 1.10 segfaults when run in docker image on my mac
  #RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.10/julia-1.10.2-linux-x86_64.tar.gz && tar zxvf julia-1.10.2-linux-x86_64.tar.gz --directory=/opt
  ARG JULIA_VERSION=1.9.4
  ARG GLOBALBRAIN_VERSION=0.1.3
  RUN  wget https://julialang-s3.julialang.org/bin/linux/x64/1.9/julia-$JULIA_VERSION-linux-x86_64.tar.gz \
    && tar zxvf julia-$JULIA_VERSION-linux-x86_64.tar.gz --directory=/opt \
    && rm julia-$JULIA_VERSION-linux-x86_64.tar.gz
  RUN  wget https://github.com/social-protocols/GlobalBrain.jl/archive/refs/tags/v$GLOBALBRAIN_VERSION.tar.gz \
    && tar zxvf v$GLOBALBRAIN_VERSION.tar.gz --directory=/myapp \
    && rm v$GLOBALBRAIN_VERSION.tar.gz \
    && mv GlobalBrain.jl-$GLOBALBRAIN_VERSION GlobalBrain.jl

  RUN cd GlobalBrain.jl && /opt/julia-$JULIA_VERSION/bin/julia --project -e 'using Pkg; Pkg.instantiate()'

  # npm install GlobalBrain.jl
  # RUN cd GlobalBrain.jl/globalbrain-node && /opt/julia-$JULIA_VERSION/bin/julia --project -e 'using Pkg; Pkg.instantiate()' && PATH=$PATH:/opt/julia-1.9.4/bin npm install

  # npm install
  COPY package.json package-lock.json .npmrc ./
  # RUN npm install --save-dev GlobalBrain.jl/globalbrain-node
  RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp
  # RUN npm install


  # npm run build
  COPY other other/
  COPY app app/
  COPY server server/
  COPY public public/
  COPY types types/
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./
  RUN npm run build


  # startup & migrations
  COPY migrate.ts startup.sh index.js ./
  COPY migrations migrations/

  ENV APP_DATABASE_FILENAME="sqlite.db"
  ENV APP_DATABASE_PATH="$LITEFS_DIR/$APP_DATABASE_FILENAME"
  ENV GB_DATABASE_PATH="$LITEFS_DIR/global-brain.db"
  ENV APP_DATABASE_URL="file:$APP_DATABASE_PATH"
  ENV CACHE_DATABASE_FILENAME="cache.db"
  ENV CACHE_DATABASE_PATH="/$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
  ENV INTERNAL_PORT="8080"
  ENV PORT="8081"
  ENV VOTE_EVENTS_PATH=/data/vote-events.jsonl
  ENV SCORE_EVENTS_PATH=/data/score-events.jsonl


  # starting the application is defined in litefs.yml
  # test locally without litefs:
  # docker run -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET sha256:xyzxyz bash /myapp/startup.sh
  CMD ["litefs", "mount"]

app-deploy:
  ARG --required COMMIT_SHA
  FROM earthly/dind:alpine-3.19-docker-25.0.5-r0
  RUN apk add curl
  RUN set -eo pipefail; curl -L https://fly.io/install.sh | sh
  WITH DOCKER --load app-deploy-image:latest=+app-deploy-image
    RUN --secret FLY_API_TOKEN \
        docker image ls \
     && /root/.fly/bin/flyctl deploy --image app-deploy-image:latest --build-arg COMMIT_SHA=$COMMIT_SHA
  END

app-typecheck:
  FROM +app-setup
  RUN npx tsc --noEmit

app-lint:
  FROM +app-setup
  COPY .eslintrc.cjs .prettierrc.js .prettierignore ./
  RUN npx eslint --max-warnings=0 . # also checks formatting

ci-test:
  BUILD +app-typecheck
  BUILD +app-lint
  BUILD +app-build

ci-deploy:
  ARG --required COMMIT_SHA
  DO +app-deploy --COMMIT_SHA=$COMMIT_SHA
