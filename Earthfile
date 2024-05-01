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
