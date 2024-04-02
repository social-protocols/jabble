npm run migrate
npm start &
cd build/GlobalBrain.jl-0.1
touch $VOTE_EVENTS_PATH
tail -n +0 -F $VOTE_EVENTS_PATH | /opt/julia-1.9.4/bin/julia --project scripts/run.jl $DATABASE_PATH - $SCORE_EVENTS_PATH
