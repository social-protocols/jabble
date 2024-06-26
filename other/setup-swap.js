#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { $ } from 'execa'

console.log('setting up swapfile...')
await $`fallocate -l 1G /swapfile`
await $`chmod 0600 /swapfile`
await $`mkswap /swapfile`
await writeFile('/proc/sys/vm/swappiness', '10')
await $`swapon /swapfile`
await writeFile('/proc/sys/vm/overcommit_memory', '1')
console.log('swapfile setup complete')
