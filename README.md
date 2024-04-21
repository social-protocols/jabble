# Jabble: Better Online Conversations

Jabble is a new kind of conversation platform, designed to make conversations on the Internet more intelligent and less polarized.

Read how Jabble makes conversations better below. And signup here to [get notified when we Launch](https://social-protocols.org/social-network/)

# How Jabble Makes Conversations Better

Like many online social platforms, in Jabble users post things and other users can reply.

[TODO screenshot: Post with reply]

Each post then gets a score, shown as a percentage, based on how many upvotes and downvotes it receives.

[TODO screenshot: Same, with the upvote/downvote buttons and score circled]

However, not all votes count equally.

First, all users' reputation starts at zero, and they must earn reputation for their votes to count at all.

Second, for their votes be counted in the score for a post, users must first read and acknowledge certain replies to that post made by other users.

### Critical Replies

When certain conditions are met, a reply to a post can be designated a **critical reply**.

[TODO screenshot: Reply with icon showing it as critical reply]

Once a critical reply is identified, all users who voted on the post will be notified. 

[TODO screenshot: Post prompting user to change their vote given critical reply]

The score on the post will then be based on the votes of those who have read and acknowledged the critical reply.

[TODO screenshot: Post showing informed/uninformed votes.]

### Why This Works

The idea is simple. If one user shares important information that might influence other people's votes, then people should have a chance to consider that information *before* they vote, not after.

This simple rule is essential to producing a **fair** outcome. In a jury trail, is it not fair if information that would have changed the jurors' verdict is withheld from them. And it is not fair if a video gets more upvotes that it would have if users knew it was fake.

Sure, a viral video on social media is not a jury trail. It doesn't really matter if it gets more votes than it deserves, does it? But actually, *what kind of content gets attention in social media matters a great deal*. When misinformed or divisive content is rewarded with attention, people post and share more misinformed and divisive content. The only way to fix conversations on the internet is to make it so that better content gets more attention.

So in a platform where the number of votes determines how much attention something receives, it matters a great deal if a fake video gets more votes than it would have if users knew it was fake.

People's time and attention is limited. They don't want their social media to be full of fake crap. If they could vote for fewer fake videos or more authentic content, they would.

Social media can be thought of as a protocol for collaboratively determining what content receives attention. Upvotes and downvotes are how the community expresses their intention. And so it's critical that the outcome of the vote be informed and fair.

## Identifying the Critical Reply

Jabble identifies a reply as critical if it appears to be **convincing**: if it makes people more or less like to vote on the post.

For example, suppose the fake video above initially receives 95 upvotes. But then the next five users see the comment claiming it is fake before voting, and they all downvote.

So 95/95 of the users who didn't see the reply upvoted the post, and 0/5 users who did see the reply upvoted the post. The reply reply seems to have changed the upvote probability dramatically, from 100% to 0%. 

So it is identified as a critical reply, and the score on the post is provisionally 0:5, instead of 95:0.

## Replies to the Reply

But the conversation is not finished! Jabble informs users who upvoted the video and gives them a chance to change their vote or to respond. 

This is important for a couple of reasons.

First, five people is a small sample size. Plus, the people who saw the comment may be a [biased, self selected sample]. 

Second, somebody might have a counter-argument. Maybe the video isn't fake after all, and there's proof! If anyone makes a convincing reply to the reply, then that reply will be designated as the critical comment, and the process will continue.

## The Critical Thread

It might seem like this process could go on forever, but it probably won't. As we [write about here], and hope to demonstrate with early Jabble users, we expect most discussions will converge after the strongest arguments have been made on each side of an issue and nobody can find anything to say that further changes minds. 

## Informed Vote

The votes of users who have seen and acknowledge the critical thread, with some statistical adjustments to correct for self-selection bias, are called the **informed votes**. The final score of a post is determined by the informed votes.

# 2. Reputation and Reasonableness

This process works great if everyone is acting in good faith. But that usually doesn't happen on the internet. So how do we force people to be **reasonable**?

Well, it turns out you kind of can force people to be reasonable using game theory. 

Every user gets a reputation, starting with 0. Until a user gains reputation, their vote has no weight.

Users gain reputation according to an ingenious scoring mechanism from MIT called the Bayesian Truth Serum. The formula is designed so that a user's expected score is maximized if they vote **honestly** -- *as long as everyone else votes honestly*. This is brilliant because, if people *do* expect each other to vote honestly, then an equilibrium is established where users will *continue* to vote and expect others to vote honestly. This continues until users can get together and coordinate on voting dishonestly, which is unlikely to be a problem as we [write about here]. This kind of equilibrium at honesty is similar to the magic that powers blockchains, as we [write about here].

Now, Jabble only considers **informed votes** when calculating the BTS scores. This means that people earn reputation by voting honesty **given the comments in the critical thread**. Users most honestly consider the information in the critical thread, and decide whether they think that other people in this forum would honestly upvote it or downvote it given this information.

If the evidence proving the video is fake is strong enough, then not only will most everybody believe that it is fake -- they will also expect that all the other voters (which include only those who saw the critical thread) will believe it is fake. So as long as there is an equilibrium at honesty, everyone will downvote the video.

So if there is an equilibrium at people voting honestly **given** the information in the critical thread, we can say there is an equilibrium at **being reasonable**. 

# 3. Karma and Community

In Jabble, you contribute to a conversation not so much by what you say, but *what you vote for*. Posts themselves are anonymous, and the karma earned by a post is divided among all the people who upvoted the post, with earlier upvoters receiving a larger share of karma than later upvoters. The author of the post themselves, being also the first upvoter, receives the largest share.

But don't try to harvest karma just by upvoting everything. You also have a *reputation* score within each community. Before your votes have any weight, you need to build reputation by upvoting content that ultimately earns a high score from existing members of the community (or downvoting low-scoring content). And if you upvote too many things that receive a low score (or vice versa), you will lose reputation in that community. 

On the other hand, you may gain reputation with the same content in a different community! So when upvoting or downvoting, consider the community. By upvoting, you are *recommending* content to that community, and staking your reputation on the belief not only that it will be popular in that community, but that it will *stand up to scrutiny*: that it is not fake, or misleading, and thus will still have a high score among users who saw the the critical comment thread.

If you are not sure, you can also just upvote content you like, without specifying a community, and Jabble will find the community for you! This is great for people with a variety of interests. You can upvote content related to your profession, as well as cute pet pics, without worrying about wasting the time and attention of people who aren't interested in one or the other.

# Reputation vs Karma

Reputation has a cap, but you can earn unlimited Karma. Reputation is an estimation of the score a post will receive within a community **given** you upvote it. Karma is your total contribution to the community. 

You can maintain a high reputation without accumulating much Karma by upvoting high-quality content, but infrequently. Or you can have a fairly low reputation and still accumulate a lot of Karma by upvoting a lot of mediocre content. But you earn Karma faster if you have a higher reputation.

## Prediction

A final piece of the Jabble process is score prediction. At any time, you can make a prediction about what the final score of a post will be. Accurate predictions further boost your reputation.

## Bridging

A final piece of Jabble's scoring formula is **briding**.

TODO: describe bridging and summarize.



