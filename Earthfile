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

# needed, when porting the Dockerfile to Earthfile
# app-deploy-litefs:
#    FROM flyio/litefs:0.5.10
#    SAVE ARTIFACT /usr/local/bin/litefs
#    # COPY +app-deploy-litefs/litefs /usr/local/bin/litefs

app-deploy-image:
  FROM DOCKERFILE .

app-deploy:
  ARG --required COMMIT_SHA
  ARG IMAGE="registry.fly.io/sn:deployment-$COMMIT_SHA"
  FROM earthly/dind:alpine-3.19-docker-25.0.5-r0
  RUN apk add curl
  RUN set -eo pipefail; curl -L https://fly.io/install.sh | sh
  COPY fly.toml ./
  WITH DOCKER --load $IMAGE=+app-deploy-image
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
  BUILD +app-build

ci-deploy:
  ARG --required COMMIT_SHA
  DO +app-deploy --COMMIT_SHA=$COMMIT_SHA
