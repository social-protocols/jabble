import { prisma } from '#app/utils/db.server.ts';

import { type Tag } from '@prisma/client';

import assert from 'assert';

export async function getOrInsertTagId(tag: string): Promise<number> {

    let t: Tag | null = await prisma.tag.findUnique({ where: { tag: tag } })

    if (t == null) {
        await prisma.tag.create({
            data: {
                tag: tag,
            },
        })
    }

    t = await prisma.tag.findUnique({ where: { tag: tag } })
    assert(t != null)
    return t.id
}