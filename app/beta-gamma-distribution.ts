export type Tally = {
	readonly count: number
	readonly total: number
}

// Simple handy Beta and Gamma distribution classes, for simple Bayesian
// updating or "Bayesian Averaging". The `update` method takes a *Tally*
// which represents the aggregate results of either one or more Bernoulli
// trials (count=total successes, total=total trials), or the result of one
// or more Poisson observations (count = total observations, total=total
// interval), and returns an updated Beta or Gamma distribution,
// respectively.
//
// For example, if we have some Beta prior of PRIOR_VOTE_PROBABILITY for the
// probability of an upvote (given a vote) and then we observe 1 upvotes out of 3 total votes,
// our new estimated vote probability is:
//
//    PRIOR_VOTE_PROBABILITY.update({count: 1, total: 3)).mean
//
// Or if we have a Gamma prior of PRIOR_VOTES_PER_VIEW, and we observe 3
// upvotes during a period of 100 views, then the new estimate of votes per view
// is:
//
//    PRIOR_VOTES_PER_VIEW.update({count: 3, total: 100}).mean
//
// Both distributions are parameterized in terms of mean and weight, where for
// the beta distribution mean=alpha/(alpha+beta), weight=alpha+beta, and for
// the gamma distribution, mean=alpha/beta, weight=beta. This is convenient,
// because the point estimate of the mean is usually what we are interested
// in.
//
// Often in hierarchical models, the mean of one distribution becomes the
// prior for a new distribution. For example, 9.2.2 of Kruschke's textbook
// describing "multiple coins from a single mint",
// https://nyu-cdsc.github.io/learningr/assets/kruschke_bayesian_in_R.pdf
//
// The resetWeight method is a convenient way of creating a new distribution
// using the mean of an existing distribution but a new weight. For example,
// in probabilities.ts
//
// let pOfAGivenShownThisNote = GLOBAL_PRIOR_UPVOTE_PROBABILITY
//     .update(tally.givenNotShownThisNote)
//     .resetWeight(WEIGHT_CONSTANT)
//     .update(tally.givenShownThisNote)
//     .mean;
//
// UPDATE LOGIC
//
// Interestingly, when parameterized using mean and weight, the update logic
// for these two distributions is identical! The posterior mean is the
// weighted mean of the prior mean and the observed mean from the tally
// (count/total), and the posterior weight is just the sum of the prior
// weight and observed weight(the Tally.total). See the comments in the
// update methods for details. So we could actually use a single BetaOrGamma
// distribution class for both distributions, but we separate them to avoid
// confusion, and because other methods we add to these classes may differ.
//
// Update Formulas for Beta Distribution
//
// When updating a Beta prior based on observations from a Bernoulli or Binomial
// distribution, the posterior is a gamma with parameters
//
//   alpha' = alpha + Z
//   beta' = beta + n - Z
//
// where n=Tally.total, and Z=tally.count. See the "Posterior
// Hyperparameters" column in the table on this wiki page:
// https://en.wikipedia.org/wiki/Conjugate_prior#cite_note-posterior-hyperparameters-3
//
// Since mean = alpha/(alpha + beta), then the posterior mean is
//
//   alpha'/(alpha' + beta')
//   = (alpha + Z) / ((alpha + Z) + (beta + n - Z))
//   = (alpha + Z) / (alpha + beta + n)
//   = (alpha/(alpha+beta) * (alpha+beta) + Z) / (alpha + beta + n)
//
// Since this.mean = alpha/(alpha+beta), and this.weight = alpha+beta, the
// above equation for updating the mean becomes:
//
//   this.mean = (this.mean * this.weight + tally.count) / (this.weight + tally.total)
//
// The posterior weight is
//
//   alpha' + beta'
//   = alpha + Z + beta + n - Z
//   = alpha + beta + n
//
// So the posterior weight
//
//   this.weight = this.weight + tally.total
//
// Update Formulas for Gamma Distribution
//
// When updating a Gamma prior based on data from a Poisson distribution, the
// posterior is a gamma with updated parameters
//
//   alpha' = alpha + Z
//   beta' = beta + n
//
// where n=Tally.total, and Z=tally.count. See the "Posterior Hyperparameters" column in the
// table on this wiki page: https://en.wikipedia.org/wiki/Conjugate_prior#cite_note-posterior-hyperparameters-3
//
// Since mean = alpha/beta, then the posterior mean is
//
// alpha'/beta'
// = (alpha + Z) / (beta + n)
// = (alpha/beta * beta + Z) / (beta + n)
//
// Since this.mean = alpha/beta, and this.weight = beta, the above
// equation for updating the mean becomes:
//
//   this.mean = (this.mean*this.weight + tally.count) / (this.weight + tally.total)
//
// And the posterior weight is beta' = beta + n = this.weight + tally.total

export class BetaDistribution {
	constructor(
		public mean: number = 0,
		public weight: number = 0,
	) {
		this.mean = mean
		this.weight = weight
	}

	update(tally: Tally): BetaDistribution {
		return new BetaDistribution(
			(this.mean * this.weight + tally.count) / (this.weight + tally.total),
			this.weight + tally.total,
		)
	}
	resetWeight(newWeight: number): BetaDistribution {
		return new BetaDistribution(this.mean, newWeight)
	}
}

export class GammaDistribution {
	constructor(
		public mean: number = 0,
		public weight: number = 0,
	) {
		this.mean = mean
		this.weight = weight
	}

	update(tally: Tally): GammaDistribution {
		return new GammaDistribution(
			(this.mean * this.weight + tally.count) / (this.weight + tally.total),
			this.weight + tally.total,
		)
	}
	resetWeight(newWeight: number): BetaDistribution {
		return new BetaDistribution(this.mean, newWeight)
	}
}

export function betaFromAlphaBeta(
	alpha: number,
	beta: number,
): BetaDistribution {
	return new BetaDistribution(alpha / (alpha + beta), alpha + beta)
}

export function betaToAlphaBeta(this: BetaDistribution): [number, number] {
	const alpha = this.mean * this.weight
	return [alpha, this.weight - alpha]
}

export function gammaFromAlphaBeta(
	alpha: number,
	beta: number,
): GammaDistribution {
	return new GammaDistribution(
		alpha / beta, // only difference from beta distribution implementation
		alpha + beta,
	)
}

export function gammaToAlphaBeta(this: GammaDistribution): [number, number] {
	const alpha = this.mean * this.weight
	return [alpha, this.weight]
}
