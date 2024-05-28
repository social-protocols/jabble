#!/bin/sh

sqlite3 -column $APP_DATABASE_PATH $'select username, datetime(session.createdAt/1000, \'unixepoch\') as login_time_utc from session join user on userId = user.id order by session.createdAt desc limit 10;'
