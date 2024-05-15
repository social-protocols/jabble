#!/usr/bin/env bash
set -euo pipefail

export SHELL="/bin/bash"

if [ -f /root/sh_env ]; then
	source /root/sh_env
fi

exec bash --posix "$@"
