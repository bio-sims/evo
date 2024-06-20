/**
 * @file Hare class definition
 * @author Zachary Mullen
 * @module hare
 * @todo Add more detailed JSDoc types, low priority
 */

const MISMATCH_CONTRAST_PERCENTAGE = 0.6;

export class Hare {
    /**
     * Represents a hare
     * @param {number} whiteness - percentage of fur that is white
     * @param {Array<Object>} alleles - list of alleles that determine behavior
     */
    constructor(whiteness, alleles) {
        /**
         * Whether the hare is alive
         * @type {boolean}
         */
        this.alive = true;
        /**
         * The whiteness of the hare's fur as a percentage
         * @type {number}
         */
        this.whiteness = whiteness;
        /**
         * The alleles that determine the hare's behavior in its methods
         * @type {Array<Object>}
         */
        this.alleles = alleles;
    }

    /**
     * Determine if the hare is mismatched against given snow coverage
     * @param {number} snowCoverage - the snow coverage to compare against
     * @returns {boolean} true if the hare is mismatched, false otherwise
     */
    isMismatched(snowCoverage) {
        return Math.abs(this.whiteness - snowCoverage) >= MISMATCH_CONTRAST_PERCENTAGE;
    }

    /**
     * Get the weeks for transitions and the rates of change
     * @returns {Object} object containing the weeks and rates for brown and white
     */
    getTransitionPhenotype() {
        // find all alleles that are coat related
        const coatAlleles = this.alleles.filter((allele) => allele.type === "coat");

        // find the average transition week and rate for both brown and white fur
        const averageKey = (key) =>
            coatAlleles.reduce((acc, allele) => acc + allele[key], 0) /
            coatAlleles.length;

        return {
            // take floor as we simulate in weeks, so a transition in the middle of a week can be seen as happening at the start of the week
            brownStart: Math.floor(averageKey("brownWeek")),
            brownRate: averageKey("brownRate"),
            whiteStart: Math.floor(averageKey("whiteWeek")),
            whiteRate: averageKey("whiteRate"),
        };
    }

    /**
     * Determine what the hare's whiteness will be at a given week
     * @param {number} week - the week to determine the whiteness for
     * @returns {number} the whiteness of the hare at the given week
     */
    getProjectedWhiteness(week) {
        const { brownStart, brownRate, whiteStart, whiteRate } = this.getTransitionPhenotype();
        let whiteness = this.whiteness;
        const yearWeek = week % 52;
        if (yearWeek >= whiteStart) {
            whiteness = Math.min(1, whiteness + whiteRate * (yearWeek - whiteStart));
        } else if (yearWeek >= brownStart) {
            whiteness = Math.max(0, whiteness - brownRate * (yearWeek - brownStart));
        }
        return whiteness;
    }

    /**
     * Run a survival pass on the hare
     * @param {number} baseSurvivalRate - the base survival rate of the hare
     * @param {number} mismatchPenalty - the penalty for mismatched fur
     * @param {number} snowCoverage - the snow coverage of the week
     * @param {number} week - the week of the simulation
     * @returns {boolean} true if the hare survives, false otherwise (may also check alive property)
     */
    doSurvivalPass(baseSurvivalRate, mismatchPenalty, snowCoverage, week) {
        if (!this.alive) return false; // if the hare is already dead, no need to simulate as it would always be false
        const { brownStart, brownRate, whiteStart, whiteRate } = this.getTransitionPhenotype();
        // update the fur color based on the week year
        const yearWeek = week % 52;
        if (yearWeek >= brownStart && yearWeek < whiteStart) {
            this.whiteness = Math.max(0, this.whiteness - brownRate);
        } else {
            this.whiteness = Math.min(1, this.whiteness + whiteRate);
        }

        // calculate the survival rate
        const survivalRate = this.isMismatched(snowCoverage)
            ? baseSurvivalRate - mismatchPenalty
            : baseSurvivalRate;

        // determine if the hare survives, 1 will always survive
        return this.alive = Math.random() <= survivalRate;
    }
}
