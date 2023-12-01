export type Tally = {
    readonly count: number,
    readonly total: number,
}

// Simple handy beta and gamma distribution classes, for simple Bayesian
// updating / Bayesian Averaging. The `update` method takes a Tally which
// represents the aggregate results of one or more Bernoulli trials
// (count=total successes, total=total trials), or the result of one or more
// Poisson observations(count = total observations, total=total interval). 
//
// These classes makes simple Bayesian updating very simple. For example, if we have a prior
// for the vote probability (upvotes per vote), and then we observe 1 upvotes out of 3 total votes, 
// our new estimated vote probability is 
//
//    PRIOR_VOTE_PROBABILITY.update({count: 1, total: 3)).average
//
// And if we have a prior for votesPerView, and we observe 3 upvotes during a period of 100 views,
// then the new estimated votesPerView is:
//
//    PRIOR_VOTES_PER_VIEW.update({count: 3, total: 100}).average
//
// Both distributions are parameterized in terms of mean and weight, where for
// the beta distribution mean=alpha/(alpha+beta), weight=alpha+beta, and for
// the gamma distribution, mean=alpha/beta, weight=beta. Interestingly, when
// parameterized using mean/weight way, the update logic for these two
// distributions is identical! The mean is just updated as a weighted average
// of the prior mean and the observed average (a Bayesian average), and the
// new weight is just the sum of the prior weight and observed weight
// (the Tally.total). We could actually use a single BetaOrGamma distribution
// class for both distributions, but we separate them to avoid confusion, and
// because other methods we add to these classes may differ.
//
// Often in hierarchical models, the mean of one distribution becomes the
// prior for a new distribution. For example, 9.2.2 of Kruschke's textbook
// describing "multiple coins from a single mint",
// https://nyu-cdsc.github.io/learningr/assets/kruschke_bayesian_in_R.pdf 
//
// The resetWeight method is a convenient way of creating a new distribution
// using the average of an existing distribution but a new weight. For
// example, in probabilities.ts
//
// let pOfAGivenShownThisNote = GLOBAL_PRIOR_UPVOTE_PROBABILITY
//     .update(tally.givenNotShownThisNote)
//     .resetWeight(WEIGHT_CONSTANT)
//     .update(tally.givenShownThisNote)
//     .average;
//

export class BetaDistribution {
    constructor(public average: number = 0, public weight: number = 0) {}

    update(tally: Tally): BetaDistribution {
        return new BetaDistribution(
            (this.average * this.weight + tally.count) / (this.weight + tally.total),
            this.weight + tally.total,        
        )
    }
    resetWeight(newWeight: number): BetaDistribution {
        return new BetaDistribution(
            this.average,
            newWeight,        
        )
    }
} 


export class GammaDistribution {
    constructor(public average: number = 0, public weight: number = 0) {}

    update(tally: Tally): GammaDistribution {
        return new GammaDistribution(
            (this.average * this.weight + tally.count) / (this.weight + tally.total),
            this.weight + tally.total,        
        )
    }
    resetWeight(newWeight: number): BetaDistribution {
        return new BetaDistribution(
            this.average,
            newWeight,        
        )
    }
} 


export function betaFromAlphaBeta(alpha: number, beta: number): BetaDistribution {
    return new BetaDistribution(
        alpha / (alpha + beta),
        alpha + beta,
    )
}

export function betaToAlphaBeta(this: BetaDistribution): [number, number] {
    let alpha = this.average * this.weight
    return [alpha, this.weight - alpha]
}


export function gammaFromAlphaBeta(alpha: number, beta: number): GammaDistribution {
    return new GammaDistribution(
        alpha / beta, // only difference from beta distribution implementation
        alpha + beta,
    )
}

export function gammaToAlphaBeta(this: GammaDistribution): [number, number] {
    let alpha = this.average * this.weight
    return [alpha, this.weight]
}



