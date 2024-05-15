# https://docs.earthly.dev/basics

VERSION 0.8


flake:
  FROM nixos/nix:2.20.4
  ARG --required PACKAGES
  WORKDIR /app
  # Enable flakes
  RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf
  COPY flake.nix flake.lock ./
  # install packages from the packages section in flake.nix
  RUN nix profile install --impure -L ".#$PACKAGES"
  SAVE IMAGE flake --cache-hint


julia-build:
  FROM +flake --PACKAGES='juliabuild'
  WORKDIR /app
  SAVE IMAGE julia-build --cache-hint

node-ext:
  FROM +julia-build
  WORKDIR /app
  ARG GLOBALBRAIN_VERSION=0.1.6

  RUN  wget https://github.com/social-protocols/GlobalBrain.jl/archive/refs/tags/v$GLOBALBRAIN_VERSION.tar.gz \
    && tar zxvf v$GLOBALBRAIN_VERSION.tar.gz \
    && rm v$GLOBALBRAIN_VERSION.tar.gz \
    && mv GlobalBrain.jl-$GLOBALBRAIN_VERSION GlobalBrain.jl

  ENV PATH=$PATH:/opt/julia-$JULIA_VERSION/bin 

  WORKDIR /app/GlobalBrain.jl
  RUN julia -t auto --code-coverage=none --check-bounds=yes --project -e 'using Pkg; Pkg.instantiate()'

  WORKDIR /app/GlobalBrain.jl/globalbrain-node
  RUN julia -t auto --code-coverage=none --check-bounds=yes --project -e 'using Pkg; Pkg.instantiate()'
  RUN npm install


  # Create artifact
  # Okay, GlobalBrain.jl is hardcoded to expect to find /app/GlobalBrain.jl/src and /app/GlobalBrain.jl/sql
  # The former can be empty.
  # We need to fix this in the other repo, but for now a workaround.
  WORKDIR /app/GlobalBrain.jl
  RUN mkdir -p /artifact/src
  RUN mkdir -p /artifact/globalbrain-node/dist
  RUN cp -r sql /artifact/
  RUN cp -r globalbrain-node/dist /artifact/globalbrain-node/
  RUN cp globalbrain-node/package.json /artifact/globalbrain-node/
  RUN cp globalbrain-node/package-lock.json /artifact/globalbrain-node/
  RUN cp globalbrain-node/index.js /artifact/globalbrain-node/

  SAVE ARTIFACT /artifact

#test-node-ext:
#  FROM +julia-build
#
#  WORKDIR /app
#  COPY --dir +node-ext/artifact ./GlobalBrain.jl
#
#  WORKDIR /app/GlobalBrain.jl/globalbrain-node
#  RUN npm install
#
#  WORKDIR /app/GlobalBrain.jl/globalbrain-node/globalbrain-node-test
#  RUN npm install --ignore-scripts --save ..
#  RUN npm test

app-setup:
  FROM +julia-build

  WORKDIR /app
  COPY package.json package-lock.json .npmrc ./
  RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp
  COPY --dir other sql ./
  RUN npx tsx ./other/build-icons.ts
  COPY --dir app server public types ./
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./

  COPY --dir +node-ext/artifact ./GlobalBrain.jl
  WORKDIR /app
  RUN npm install --ignore-scripts --save './GlobalBrain.jl/globalbrain-node'

  COPY tests/globalbrain-node.js tests/
  RUN node tests/globalbrain-node.js test.db

app-build:
  FROM +app-setup
  RUN npm run build
  SAVE ARTIFACT server-build AS LOCAL server-build
  SAVE ARTIFACT build AS LOCAL build
  SAVE ARTIFACT node_modules AS LOCAL node_modules
  SAVE ARTIFACT package-lock.json AS LOCAL package-lock.json
  SAVE ARTIFACT package.json AS LOCAL package.json

# needed, when porting the Dockerfile to Earthfile
app-deploy-litefs:
   FROM flyio/litefs:0.5.10
   SAVE ARTIFACT /usr/local/bin/litefs

docker-image:
  FROM +flake --PACKAGES='base'

  WORKDIR /app

  ENV NODE_ENV production
  ENV FLY="true"

  # litefs
  ENV LITEFS_DIR="/litefs/data"
  COPY +app-deploy-litefs/litefs /usr/local/bin/litefs
  COPY other/litefs.yml /etc/litefs.yml
  RUN mkdir -p /data ${LITEFS_DIR}

  # npm run build
  COPY --dir other app server public types ./
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./
  COPY --dir +app-build/server-build +app-build/build +app-build/node_modules +app-build/package-lock.json +app-build/package.json ./
  COPY --dir +node-ext/artifact ./GlobalBrain.jl

  # should not install anything
  RUN cd ./GlobalBrain.jl/globalbrain-node && npm install

  COPY tests/globalbrain-node.js tests/
  RUN node tests/globalbrain-node.js test.db

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

  ENV SESSION_SECRET=super-duper-s3cret
  ENV HONEYPOT_SECRET=super-duper-s3cret
  ENV INTERNAL_COMMAND_TOKEN=some-made-up-token

  # starting the application is defined in litefs.yml
  # test locally without litefs:
  # docker run -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET sha256:xyzxyz bash /app/startup.sh
  CMD ["litefs", "mount"]
  SAVE IMAGE jabble:latest


app-deploy:
  # run locally:
  # FLY_API_TOKEN=$(flyctl tokens create deploy) earthly --allow-privileged --secret FLY_API_TOKEN -i +app-deploy --COMMIT_SHA=<xxxxxx>
  ARG --required COMMIT_SHA
  ARG IMAGE="registry.fly.io/sn:deployment-$COMMIT_SHA"
  FROM earthly/dind:alpine-3.19-docker-25.0.5-r0
  RUN apk add curl
  RUN set -eo pipefail; curl -L https://fly.io/install.sh | sh
  COPY fly.toml ./
  WITH DOCKER --load $IMAGE=+docker-image
    RUN --secret FLY_API_TOKEN \
        docker image ls \
     && /root/.fly/bin/flyctl auth docker \
     && docker push $IMAGE \
     && /root/.fly/bin/flyctl deploy --image $IMAGE --build-arg COMMIT_SHA=$COMMIT_SHA
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
  BUILD +docker-image

ci-deploy:
  BUILD +ci-test
  ARG --required COMMIT_SHA
  DO +app-deploy --COMMIT_SHA=$COMMIT_SHA
