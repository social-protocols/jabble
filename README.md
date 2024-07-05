<h1 align="center" style="border-bottom: none">
    <div>
        <a href="https://sn.fly.dev/">
            Jabble
        </a>
    </div>
    Better Online Conversations
</h1>

> [!NOTE]
> Jabble is a new kind of conversation platform, designed to make conversations on the Internet more intelligent and less polarized. [Signup here](https://social-protocols.org/social-network/) to get notified when we launch.

## How it Works

Like many online social platforms, in Jabble users post things and other users can reply. Here's an example:

SCREENSHOT
<br/>*a post with a reply*

Each post or reply then gets a score, shown as a percentage, based on how many upvotes and downvotes it receives.

SCREENSHOT
<br/>*a reply with votes*


**However, not all votes count equally!** Your votes on a post get more weight if you **read and acknowledge convincing replies** to that post made by other users.


## Convincingness

Jabble scores replies based on *how convincing they appear to be*. A reply is given a high convincingness score if users who have considered that reply are more likely to upvote the post being replied to (and vice versa). For example, if a post containing a video has a reply claiming that the video is fake, users who see that reply may be less likely to upvote the video.

SCREENSHOT
<br/>*a reply with a convincingness score*

Jabble will place the replies with the highest convincingness score at the top, in order to make sure as many people as possible are exposed to the most convincing replies and have a chance to respond to them.

## The Big Idea: Informed Content

The idea is simple. If one user shares information that might influence other people's votes, then people should have a chance to consider that information when deciding how to vote.

Disinformation, misinformation, clickbait etc. are all fundamentally the same thing: **misinformed content**, information that people spread, but that they wouldn't if they knew more. But the antidote to misinformation is information. 

Jabble combats misinformation, and promotes more informed content, by identifying and promoting:

1. convincing information
2. posts that people still upvote *after* they have seen the most convincing information

## Responding to Convincing Replies

Of course, a convincing reply may itself be misinformed. So another reason the algorithm puts the most convincing replies at the top is to make sure people have a chance to respond to them.

You can respond to a convincing reply in two ways:

1. By voting on it
2. By replying to it

### Responding by Voting

Simply voting on a convincing reply gives **more weight** to your vote on the post being replied to. This is because Jabble considers the votes of people who have voted on convincing replies to be more **informed**.

For example, suppose you upvoted the post with the video, but have not seen the reply claiming it is fake. You are in one sense less informed than the users who saw the reply. Voting on the reply signals to Jabble that you have considered it and are thus fully-informed, and so your vote will have more influence on the final score of the video.

Now, suppose you are not convinced by the reply. By downvoting the reply, while not changing your vote on the video, you signal to Jabble that you are informed but unconvinced. Jabble will give more weight to your upvote on the video, resulting in an *increase* it its score (as well as a *decrease* in the score for the reply). 

This means that you can have more influence on the scores of posts, and thus on what posts get more or less attention (and possibly go viral), by making sure to vote on comments with high convincingness scores. 

This will be immediately visible in the UI: when you vote on a reply with a high convincingness score, you will see an immediate change in the score of the post being replied to.

SCREENSHOT
<br/>*voting on this comment gives more weight to vote on video*

### Responding by Replying

You can also respond to a convincing reply by replying to it. Replying to a reply also signals to Jabble that you have considered it, and thus gives your vote more weight. 

But a reply also gives you a chance to make counter-arguments that might convince people the other way. For example, if you reply with a reason to believe that the video is in fact authentic, and people who consider your counter-argument are more likely to upvote the video (compared to people who only considered the reply claiming the video was fake), then your counter-argument will have a high convincingness score!

SCREENSHOT
<br/>*a reply to a convincing reply*

It might seem like this process could go on forever, but it probably won't. As we hope to demonstrate with early Jabble users, we expect most discussions will converge after the strongest arguments have been made on each side of an issue and nobody can find anything to say that further changes minds. 

## Deliberation and Informed Opinion

The result, we hope, is a conversation platform that drives constructive **deliberative processes** for discovering **informed opinion**. By focusing attention on convincing replies, and the replies to those replies, the process drives a constructive discussion that surfaces the best arguments on both sides of any controversy. And by scoring posts based on the **informed votes** of users who have considered the most informed argument threads, the algorithm will promote **informed content**, instead of content that gets a lot of upvotes based on initial impressions and knee-jerk reactions.

## Conclusion

The algorithm we've described here is just one part of our vision for improving ranking algorithm for social platforms. It doesn't yet solve certain big problems, such as people voting in bad faith. Or worse: large-scale, coordinated manipulation efforts. 

We hope to address the problem of bad-faith actors using a reputation system, combined with a game-theoretical mechanism called the Bayesian Truth Serum, both of which we discuss in our article on [Deliberative Consensus Protocols](https://social-protocols.org/deliberative-consensus-protocols/).







<!--




## A Change to Respond

Representativeness






# 1. Information and Fairness






When certain conditions are met, a reply to a post will be designated a **critical reply**. The critical reply will be indicated by a green dot.

![screenshot of a critical reply](public/img/critical-reply.png)
<br/>*a critical reply*

If you have have voted on a post, but have not yet seen the critical reply, you will be notified. 

Once you have voted on the critical reply, your vote on the post will get more weight.

![screenshot of a critical reply after vote](public/img/critical-reply-after-vote.png)
<br/>*a critical reply after vote*

And of course, if the critical reply changes your mind about the post, you can change your vote on the post. 


## The Big Idea

The idea is simple. If one user shares information that might influence other people's votes, then people should have a chance to consider that information **before** they decide how to vote.

Clickbait, disinformation, misinformation, etc. are all fundamentally the same thing: **misinformed content**. Misinformed content is stuff people wouldn't click on, upvote or share if they knew more.

The antidote to misinformed content is information. Jabble tries to promote more informed content based on the simple idea of looking at how people vote if they have more information.

## Identifying the Critical Reply

Jabble identifies a reply as critical if it appears to be **convincing**: if it makes people more or less like to vote on the post. 

Suppose that, in our example with the inauthentic earthquake video, initially 95 out of 100 users upvote the video. But suppose there were 20 users voted on the reply claiming the video was not what it claimed to be, and only 1 of of those upvoted the video. Since the reply appears to be very convincing, it is designated a critical reply. 


### The Critical Thread

But the conversation is not finished! Jabble informs users who upvoted the video and gives them a chance to change their vote or to respond. Maybe the video isn't fake after all! If anyone makes a convincing reply to the reply, then that reply will be designated as the critical comment, and the process will continue.

The thread of the most convincing replies, the most convincing reply to that reply, etc. is called the critical thread.

![screenshot of a critical thread](public/img/critical-thread.png)
<br/>*a critical thread*


It might seem like this process could go on forever, but it probably won't. As we hope to demonstrate with early Jabble users, we expect most discussions will converge after the strongest arguments have been made on each side of an issue and nobody can find anything to say that further changes minds. 

## Informed Votes

The votes of users who have voted on the critical thread are called the **informed votes**. The score on the post is just the probability that an informed vote is an upvote. We call this probability the **informed upvote probability**. 

In our example with the earthquake video, informed users are much less likely to upvote the video, and since informed votes have more weight, as users start to vote on the critical reply the estimated informed upvoted probability falls quickly towards 5%. 

![a chart of the informed vs. uniformed upvote probability in a simulated scenario](public/img/informed-probability-chart.png)
<br/>*the informed vs. uniformed upvote probability in a simulated scenario*


# 2. Reputation and Reasonableness

This process works great if everyone is acting in good faith. But on the Internet, sometimes they're not. So how do we force people to be **reasonable**?

Well, it turns out you kind of can force people to be reasonable using game theory. 

Every user gets a reputation, starting with 0. Until a user gains reputation, their vote has no weight.

Users gain reputation according to an ingenious scoring mechanism from MIT called the Bayesian Truth Serum. The formula is designed so that a user's expected score is maximized if they vote **honestly** -- *as long as everyone else votes honestly*. This is brilliant because, if people *expect* each other to vote honestly, then an equilibrium is established where users will *continue* to vote and expect others to vote honestly. This continues until users can get together and coordinate on voting dishonestly, which is unlikely to be a problem as we [write about here]. This kind of equilibrium at honesty is similar to the magic that powers blockchains, as we [write about here].

Now, Jabble only considers **informed votes** when calculating the BTS scores. This means that people earn reputation by voting honesty **given the comments in the critical thread**. Users most honestly consider the information in the critical thread, and decide whether they think that other people in this forum would honestly upvote it or downvote it given this information.

If the evidence proving the video is fake is strong enough, then not only will most everybody believe that the video is fake -- they will also expect that all the other voters who saw the evidence to believe the video is fake. So as long as there is an equilibrium at honesty, everyone will downvote the video.

So if there is an equilibrium at people voting honestly **given** the information and arguments provided, we can say there is an equilibrium at **being reasonable**.

# 3. Karma and Community

In Jabble, you contribute to a conversation not so much by what you say, but *what you vote for*. Posts themselves are anonymous, and the karma earned by a post is divided among all the people who upvoted the post, with earlier upvoters receiving a larger share of karma than later upvoters. The author of the post themselves, being the first upvoter, receives the largest share.

But don't try to harvest karma just by upvoting everything. You also have a *reputation* score within each community. Before your votes have any weight, you need to build reputation by upvoting content that ultimately earns a high score from existing members of the community (or downvoting low-scoring content). And if you upvote too many things that receive a low score (or vice versa), you will lose reputation in that community. 

On the other hand, you may gain reputation with the same content in a different community! So when upvoting or downvoting, consider the community. By upvoting, you are *recommending* content to that community, and staking your reputation on the belief not only that it will be popular in that community, but that it will *stand up to scrutiny*: that it is not fake, or misleading, and thus will still have a high score among users who saw the the critical comment thread.

----

If you are not sure, you can also just upvote content you like, without specifying a community, and Jabble will find the community for you! This is great for people with a variety of interests. You can upvote content related to your profession, as well as cute pet pics, without worrying about wasting the time and attention of people who aren't interested in one or the other.

## Reputation vs Karma

Reputation has a cap, but you can earn unlimited Karma. Reputation is an estimation of the score a post will receive within a community **given** you upvote it. Karma is your total contribution to the community. 

You can maintain a high reputation without accumulating much Karma by upvoting high-quality content, but infrequently. Or you can have a fairly low reputation and still accumulate a lot of Karma by upvoting a lot of mediocre content. But you earn Karma faster if you have a higher reputation.

# 3. Bias and Bridging

A final piece of Jabble's scoring formula is **bridging**.

TODO: describe bridging and summarize.


# 4. Prediction and Precision

A final piece of the Jabble process is the prediction market. At any time, you can make a prediction about what the final score of a post will be. Accurate predictions further boost your reputation. Predictions are a part of the Bayesian Truth Serum scoring mechanism.


TODO: describe prediction market






## Fairness

This is essential to producing a **fair** outcome. In a jury trail, is it not fair if information that would have changed the jurors' verdict is withheld from them. Similarly it is not fair if a video gets more upvotes than it would have if users knew it was not authentic.

Sure, a viral video on social media is not a jury trail. It doesn't really matter if it gets more votes than it deserves, does it?

But actually, **what kind of content gets attention in social media matters a great deal**. When misinformed or divisive content is rewarded with attention, people post and share more misinformed and divisive content. The only way to fix conversations on the internet is to make it so that the right kind of content gets more attention.

In a platform where the number of votes determines how much attention something receives, it matters a great deal if an in authentic video gets more votes than it would have if users knew it was inauthentic. People don't *want* their time and attention wasted with fake videos. And yet the fake video is rewarded with attention because people voted on it, not knowing it was fake. This isn't the way it should work.

Social media can be thought of as a protocol for collaboratively determining what content receives attention. Upvotes and downvotes are how the community expresses their intention. And so it's critical that the outcome of the vote be informed and fair.

-->
