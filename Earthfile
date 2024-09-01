# https://docs.earthly.dev/basics

VERSION 0.8

nix:
  FROM ubuntu:24.04
  RUN apt-get update && apt-get install -y curl \
   && curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install linux \
    --extra-conf "sandbox = false" \
    --init none \
    --no-confirm \
   && apt remove --auto-remove -y curl
  ENV PATH="${PATH}:/nix/var/nix/profiles/default/bin"

nix-dev-shell:
  ARG --required DEVSHELL
  FROM +nix
  # replace /bin/sh with a script that sources `/root/sh_env` for every RUN command.
  # we use this to execute all `RUN`-commands in our nix dev shell.
  # we need to explicitly delete `/bin/sh` first, because it's a symlink to `/bin/busybox`,
  # and `COPY` would actually follow the symlink and replace `/bin/busybox` instead.
  RUN rm /bin/sh
  # copy in our own `sh`, which wraps `bash`, and which sources `/root/sh_env`
  COPY ci_sh.sh /bin/sh
  ARG ARCH=$(uname -m)
  # cache `/nix`, especially `/nix/store`, with correct chmod and a global id, so we can reuse it
  # only works before installing nix
  # CACHE --persist --sharing shared --chmod 0755 --id nix-store /nix
  WORKDIR /app
  COPY flake.nix flake.lock .
  # build our dev-shell, creating a gcroot, so it won't be garbage collected by nix.
  # Then set up our `/root/sh_env` file to source our flake env, will be used by ALL `RUN`-commands!
  RUN nix build --out-link /root/flake-devShell-gcroot ".#devShells.$ARCH-linux.$DEVSHELL" \
   && nix print-dev-env ".#$DEVSHELL" >> /root/sh_env \
   && nix-collect-garbage

nix-packages:
  ARG --required PACKAGES
  FROM +nix
  WORKDIR /app
  COPY flake.nix flake.lock .
  RUN nix profile install --impure ".#$PACKAGES" \
   && nix-collect-garbage \
   && rm -rf /root/.cache
  # RUN nix store optimise # hard linking can save ~40M


globalbrain-node-package:
  FROM scratch
  ARG GLOBALBRAIN_REF=954ab21561da0f89adaef0f99de2dddbc23af78d # Use weighted average scoring instead of top-thread based scoring. Fixes one broken test
  COPY github.com/social-protocols/GlobalBrain.jl:$GLOBALBRAIN_REF+node-ext/artifact /artifact
  # COPY ../GlobalBrain.jl+node-ext/artifact /artifact
  SAVE ARTIFACT /artifact


GLOBALBRAIN_INSTALL_AND_TEST:
  # is used in other targets
  FUNCTION
  ARG --required destination
  COPY +globalbrain-node-package/artifact $destination
  # COPY ../GlobalBrain.jl+node-ext/artifact $destination
  RUN cd $destination && npm test # because this target is a function, test runs on the callsite


app-setup:
  FROM +nix-dev-shell --DEVSHELL='build'
  DO +GLOBALBRAIN_INSTALL_AND_TEST --destination=/globalbrain-node-package

  WORKDIR /app
  COPY package.json package-lock.json .npmrc ./
  RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp
  RUN npm install --save '/globalbrain-node-package' # will compile node extension for this environment
  COPY --dir other ./
  RUN npx tsx ./other/build-icons.ts
  COPY --dir app server public types ./
  COPY index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./

app-build:
  FROM +app-setup
  RUN npm run build
  SAVE ARTIFACT server-build
  SAVE ARTIFACT build
  SAVE ARTIFACT public
  SAVE ARTIFACT node_modules
  SAVE ARTIFACT package-lock.json
  SAVE ARTIFACT package.json
  SAVE ARTIFACT .npmrc

app-deploy-litefs:
   FROM flyio/litefs:0.5.10
   SAVE ARTIFACT /usr/local/bin/litefs

docker-image:
  FROM +nix-packages --PACKAGES='production'

  WORKDIR /app

  ENV NODE_ENV production
  ENV FLY="true"

  # litefs
  ENV LITEFS_DIR="/litefs/data"
  COPY +app-deploy-litefs/litefs /usr/local/bin/litefs
  COPY other/litefs.yml /etc/litefs.yml
  RUN mkdir -p /data ${LITEFS_DIR}


  DO +GLOBALBRAIN_INSTALL_AND_TEST --destination=/globalbrain-node-package # should not compile anything, because the build environment was the same

  # npm run build
  COPY --dir other app server public types index.js tsconfig.json remix.config.js tailwind.config.ts postcss.config.js components.json ./
  COPY --dir +app-build/server-build +app-build/build +app-build/public +app-build/node_modules +app-build/package-lock.json +app-build/package.json +app-build/.npmrc ./


  # startup & migrations
  COPY --dir migrate.ts migrations startup.sh index.js ./

  ENV APP_DATABASE_FILENAME="sqlite.db"
  ENV APP_DATABASE_PATH="/data/$APP_DATABASE_FILENAME"
  ENV GB_DATABASE_PATH="/data/global-brain.db"
  ENV APP_DATABASE_URL="file:$APP_DATABASE_PATH"
  ENV CACHE_DATABASE_FILENAME="cache.db"
  ENV CACHE_DATABASE_PATH="/data/$CACHE_DATABASE_FILENAME"
  ENV HTTP_LOG_PATH="/data/http-log.jsonl"
  ENV INTERNAL_PORT="8080"
  ENV PORT="8081"

  # RUN find / \( -type f -o -type d \) -mindepth 1 -maxdepth 1 -print0 | xargs -0 du -sh | sort -hr | head -20 \
  #  && find /nix/store \( -type f -o -type d \) -mindepth 1 -maxdepth 1 -print0 | xargs -0 du -sh | sort -hr | head -20 \
  #  && find /app \( -type f -o -type d \) -mindepth 1 -maxdepth 1 -print0 | xargs -0 du -sh | sort -hr | head -20 \
  #  && find /app/node_modules \( -type f -o -type d \) -mindepth 1 -maxdepth 1 -print0 | xargs -0 du -sh | sort -hr | head -20 \
  #  && find /root \( -type f -o -type d \) -mindepth 1 -maxdepth 1 -print0 | xargs -0 du -sh | sort -hr | head -20

  # starting the application is defined in litefs.yml
  # test locally without litefs:
  # docker run -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET sha256:xyzxyz /bin/sh startup.sh
  # CMD ["/usr/local/bin/litefs", "mount"]
  CMD ["/app/startup.sh"]
  SAVE IMAGE jabble:latest

docker-image-e2e-test:
  # set up an image with dind (docker in docker) and nix
  FROM earthly/dind:alpine-3.19-docker-25.0.5-r0
  RUN apk add curl \
   && curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install linux \
    --extra-conf "sandbox = false" \
    --init none \
    --no-confirm
  ENV PATH="${PATH}:/nix/var/nix/profiles/default/bin"
  WORKDIR /app
  COPY flake.nix flake.lock .
  RUN nix develop ".#e2e" --command echo warmed up
  COPY --dir e2e playwright.config.ts docker-compose.yml ./
  WITH DOCKER --load jabble:latest=+docker-image
    RUN docker image ls \
     && (docker-compose up &) \
     && echo waiting for http server to come online... \
     && timeout 60s sh -c 'until curl --silent --fail http://localhost:8081 > /dev/null; do sleep 1; done' \
     && CI=true nix develop --impure ".#e2e" --command playwright test
  END

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
  ENV CI=true
  RUN npx eslint --max-warnings=0 . # also checks formatting

ci-test:
  BUILD +app-typecheck
  BUILD +app-lint
  BUILD +docker-image-e2e-test

ci-deploy:
  # To run manually:
  # FLY_API_TOKEN=$(flyctl tokens create deploy) earthly --allow-privileged --secret FLY_API_TOKEN +ci-deploy --COMMIT_SHA=$(git rev-parse HEAD)
  BUILD +ci-test
  ARG --required COMMIT_SHA
  BUILD +app-deploy --COMMIT_SHA=$COMMIT_SHA
