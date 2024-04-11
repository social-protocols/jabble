# This file is moved to the root directory before building the image

# base node image
FROM node:20-bookworm-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

RUN apt-get update && apt-get install -y fuse3 sqlite3 ca-certificates wget

# Julie 1.10 segfaults when run in docker image on my mac
#RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.10/julia-1.10.2-linux-x86_64.tar.gz && tar zxvf julia-1.10.2-linux-x86_64.tar.gz --directory=/opt

RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.9/julia-1.9.4-linux-x86_64.tar.gz  && tar zxvf julia-1.9.4-linux-x86_64.tar.gz --directory=/opt

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
RUN npm install --include=dev

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json .npmrc ./
# RUN npm prune --omit=dev # we need to run migrations, so we need dev dependencies, better would be to bundle them

# Build the app
FROM base as build

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV APP_DATABASE_FILENAME="social-network.db"
ENV APP_DATABASE_PATH="$LITEFS_DIR/$APP_DATABASE_FILENAME"
ENV GB_DATABASE_PATH="$LITEFS_DIR/global-brain.db"
ENV APP_DATABASE_URL="file:$APP_DATABASE_PATH"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="/$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
ENV VOTE_EVENTS_PATH=/data/vote-events.jsonl
ENV SCORE_EVENTS_PATH=/data/score-events.jsonl

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$APP_DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

RUN wget https://github.com/social-protocols/GlobalBrain.jl/archive/refs/tags/0.1.tar.gz && tar zxvf 0.1.tar.gz --directory=/myapp
RUN cd GlobalBrain.jl-0.1 && /opt/julia-1.9.4/bin/julia --project -e 'using Pkg; Pkg.instantiate()'

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/package.json /myapp/package.json
# for migrations:
COPY --from=build /myapp/migrate.ts /myapp/migrate.ts
COPY --from=build /myapp/startup.sh /myapp/startup.sh
COPY --from=build /myapp/app /myapp/app

COPY --from=build /myapp/server-build /myapp/server-build
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
COPY --from=build /myapp/app/components/ui/icons /myapp/app/components/ui/icons



# prepare for litefs
COPY --from=flyio/litefs:0.5.10 /usr/local/bin/litefs /usr/local/bin/litefs
ADD other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

ADD . .

# starting the application is defined in litefs.yml
# test locally without litefs:
# docker run -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET sha256:xyzxyz bash /myapp/startup.sh
CMD ["litefs", "mount"]
