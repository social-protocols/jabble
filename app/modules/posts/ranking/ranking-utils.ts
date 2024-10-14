import Immutable from 'immutable'
import { type ReplyTree, type MutableReplyTree } from './ranking-types.ts'

export function toImmutableReplyTree(replyTree: MutableReplyTree): ReplyTree {
	return {
		...replyTree,
		replies: Immutable.List(replyTree.replies.map(toImmutableReplyTree)),
	}
}

export function addReplyToReplyTree(
	tree: ReplyTree,
	reply: ReplyTree,
): ReplyTree {
	if (reply.post.parentId == tree.post.id) {
		return {
			...tree,
			replies: tree.replies.insert(0, reply),
		}
	}
	return {
		...tree,
		replies: tree.replies.map(child => addReplyToReplyTree(child, reply)),
	}
}
