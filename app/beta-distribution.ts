export type Tally = {
    readonly count: number,
    readonly total: number,
}


export function fromAlphaBeta(alpha: number, beta: number): BetaDistribution {
    return new BetaDistribution(
        alpha / (alpha + beta),
        alpha + beta,
    )
}

export class BetaDistribution {
    constructor(public average: number = 0, public weight: number = 0) {}

    update(tally: Tally): BetaDistribution {
        return new BetaDistribution(
            bayesian_average(this.average, this.weight, tally),
            this.weight + tally.total,        
        )
    }
} 

function bayesian_average(prior_average: number, weight: number, tally: Tally): number {
    return (prior_average * weight + tally.count) / (weight + tally.total)
}

