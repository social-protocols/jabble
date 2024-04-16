FROM node:20-bookworm-slim as base

WORKDIR /myapp

ENV NODE_ENV production
ENV FLY="true"


RUN apt-get update && apt-get install -y fuse3 sqlite3 ca-certificates wget

# litefs
ENV LITEFS_DIR="/litefs/data"
COPY --from=flyio/litefs:0.5.10 /usr/local/bin/litefs /usr/local/bin/litefs
COPY other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}


# GlobalBrain service
# Julie 1.10 segfaults when run in docker image on my mac
#RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.10/julia-1.10.2-linux-x86_64.tar.gz && tar zxvf julia-1.10.2-linux-x86_64.tar.gz --directory=/opt
ARG JULIA_VERSION=1.9.4
ARG GLOBALBRAIN_VERSION=0.1.1
RUN  wget https://julialang-s3.julialang.org/bin/linux/x64/1.9/julia-$JULIA_VERSION-linux-x86_64.tar.gz \
  && tar zxvf julia-$JULIA_VERSION-linux-x86_64.tar.gz --directory=/opt \
  && rm julia-$JULIA_VERSION-linux-x86_64.tar.gz
RUN  wget https://github.com/social-protocols/GlobalBrain.jl/archive/refs/tags/$GLOBALBRAIN_VERSION.tar.gz \
  && tar zxvf $GLOBALBRAIN_VERSION.tar.gz --directory=/myapp \
  && rm $GLOBALBRAIN_VERSION.tar.gz
RUN cd GlobalBrain.jl-$GLOBALBRAIN_VERSION && /opt/julia-$JULIA_VERSION/bin/julia --project -e 'using Pkg; Pkg.instantiate()'


# npm install
COPY package.json package-lock.json .npmrc ./
RUN npm install --include=dev && rm -rf /root/.npm /root/.node-gyp


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
