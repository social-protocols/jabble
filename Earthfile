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


nix-dev-shell:
  ARG --required DEVSHELL
  FROM nixos/nix:2.20.4
  # enable flakes
  RUN echo "extra-experimental-features = nix-command flakes" >> /etc/nix/nix.conf
  # replace /bin/sh with a script that sources `/root/sh_env` for every RUN command.
  # we use this to execute all `RUN`-commands in our nix dev shell.
  # we need to explicitly delete `/bin/sh` first, because it's a symlink to `/bin/busybox`,
  # and `COPY` would actually follow the symlink and replace `/bin/busybox` instead.
  RUN rm /bin/sh
  # copy in our own `sh`, which wraps `bash`, and which sources `/root/sh_env`
  COPY ci_sh.sh /bin/sh
  ARG ARCH=$(uname -m)
  # cache `/nix`, especially `/nix/store`, with correct chmod and a global id, so we can reuse it
  # CACHE --persist --sharing shared --chmod 0755 --id nix-store /nix
  WORKDIR /app
  COPY flake.nix flake.lock .
  # build our dev-shell, creating a gcroot, so it won't be garbage collected by nix.
  RUN nix build --out-link /root/flake-devShell-gcroot ".#devShells.$ARCH-linux.$DEVSHELL"
  # set up our `/root/sh_env` file to source our flake env, will be used by ALL `RUN`-commands!
  RUN nix print-dev-env ".#$DEVSHELL" >> /root/sh_env


node-ext:
  FROM +nix-dev-shell --DEVSHELL='juliabuild'
  WORKDIR /app

  ARG GLOBALBRAIN_REF=49afe5257e0f3f1c0885088afaced2c70ca38c31
  RUN wget https://github.com/social-protocols/GlobalBrain.jl/archive/$GLOBALBRAIN_REF.tar.gz \
   && mkdir GlobalBrain.jl \
   && tar zxvf $GLOBALBRAIN_REF.tar.gz --directory GlobalBrain.jl --strip-components=1 \
   && rm $GLOBALBRAIN_REF.tar.gz

  WORKDIR /app/GlobalBrain.jl
  RUN julia -t auto --code-coverage=none --check-bounds=yes --project -e 'using Pkg; Pkg.instantiate(); Pkg.precompile()'

  WORKDIR /app/GlobalBrain.jl/globalbrain-node/julia
  RUN julia -t auto --startup-file=no --project -e 'using Pkg; Pkg.instantiate(); include("build.jl")'

  WORKDIR /app/GlobalBrain.jl/globalbrain-node
  ENV GLOBALBRAIN_INCLUDES=julia/build/include/julia_init.h julia/build/include/globalbrain.h
  ENV GLOBALBRAIN_PATH=julia/build/lib/libglobalbrain.so
  RUN LD_LIBRARY_PATH=julia/build/lib:julia/build/lib/julia:$LD_LIBRARY_PATH g++ test.cc -o test-cpp.out -Ijulia/build/include -Ljulia/build/lib -Ljulia/build/lib/julia -ljulia -lglobalbrain
  RUN LD_LIBRARY_PATH=julia/build/lib:julia/build/lib/julia:$LD_LIBRARY_PATH ldd ./test-cpp.out
  RUN LD_LIBRARY_PATH=julia/build/lib:julia/build/lib/julia:$LD_LIBRARY_PATH ./test-cpp.out || echo "Failed test yo"
  RUN npm install
  RUN npm test

  # Create artifact
  # Okay, GlobalBrain.jl is hardcoded to expect to find /app/GlobalBrain.jl/src and /app/GlobalBrain.jl/sql
  # The former can be empty.
  # We need to fix this in the other repo, but for now a workaround.
  # WORKDIR /app/GlobalBrain.jl/globalbrain-node
  # RUN mkdir -p /artifact/julia/build \
  #  && cp -r julia/build /artifact/julia/build \
  #  && cp package.json /artifact/ \
  #  && cp package-lock.json /artifact/ \
  #  && cp binding.gyp /artifact/ \
  #  && cp index.js /artifact/ \
  #  && cp test.js /artifact/

  SAVE ARTIFACT . /artifact

app-setup:
  FROM +nix-dev-shell --DEVSHELL='juliabuild'
  WORKDIR /app
  COPY package.json package-lock.json .npmrc ./
  RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp
  COPY --dir other sql ./
  RUN npx tsx ./other/build-icons.ts
  COPY --dir app server public types ./

  COPY --dir +node-ext/artifact ./globalbrain-node
  WORKDIR /app
  RUN npm install --save './globalbrain-node'

  WORKDIR /app/globalbrain-node
  RUN npm test

  WORKDIR /app
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./

app-build:
  FROM +app-setup
  RUN npm run build
  SAVE ARTIFACT server-build AS LOCAL server-build
  SAVE ARTIFACT build AS LOCAL build
  SAVE ARTIFACT node_modules AS LOCAL node_modules
  SAVE ARTIFACT package-lock.json AS LOCAL package-lock.json
  SAVE ARTIFACT package.json AS LOCAL package.json

app-deploy-litefs:
   FROM flyio/litefs:0.5.10
   SAVE ARTIFACT /usr/local/bin/litefs

docker-image:
  FROM +flake --PACKAGES='base'
  RUN nix profile install nixpkgs/ba733f8000925e837e30765f273fec153426403d#python3
  RUN nix profile install nixpkgs/ba733f8000925e837e30765f273fec153426403d#gnumake
  RUN nix profile install nixpkgs/ba733f8000925e837e30765f273fec153426403d#gcc
  RUN nix profile install nixpkgs/ba733f8000925e837e30765f273fec153426403d#gnused
  # FROM +nix-dev-shell --DEVSHELL='juliabuild'

  WORKDIR /app

  ENV NODE_ENV production
  ENV FLY="true"

  # litefs
  ENV LITEFS_DIR="/litefs/data"
  COPY +app-deploy-litefs/litefs /usr/local/bin/litefs
  COPY other/litefs.yml /etc/litefs.yml
  RUN mkdir -p /data ${LITEFS_DIR}

  # npm run build
  COPY --dir other app server public types index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./
  COPY --dir +app-build/server-build +app-build/build +app-build/node_modules +app-build/package-lock.json +app-build/package.json ./
  COPY --dir +node-ext/artifact ./globalbrain-node

  # should not install anything
  RUN cd ./globalbrain-node && npm install && npm test

  # startup & migrations
  COPY --dir migrate.ts migrations startup.sh index.js ./

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
