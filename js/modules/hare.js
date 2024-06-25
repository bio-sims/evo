/**
 * @file Hare class definition
 * @author Zachary Mullen
 * @module hare
 * @todo Add more detailed JSDoc types, low priority
 */

const MISMATCH_CONTRAST_PERCENTAGE = 0.6;

/**
 * Convert a hex color to RGB
 * @param {string} hex - hex color to convert to RGB
 * @todo consider moving to a utility file or something similar
 */
const convertHexToRGB = (hex) => {
    if (!hex.startsWith("#")) {
        throw new Error("Hex color must start with #");
    }
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
};

export class Hare {
    /**
     * Represents a hare
     * @param {number} whiteness - percentage of fur that is white
     * @param {Array<Object>} alleles - list of alleles that determine behavior
     */
    constructor(whiteness, alleles, id = -1) {
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
        /**
         * The id of the hare, which should always be unique and below the carrying capacity
         * @type {number}
         */
        this.id = id;
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
        const yearWeek = week % 52;
        let whiteness = this.whiteness;
        if (yearWeek >= brownStart && yearWeek < whiteStart) {
            whiteness = Math.max(0, whiteness - brownRate * (whiteStart - yearWeek));
        } else {
            whiteness = Math.min(1, whiteness + whiteRate * (yearWeek + 52 - whiteStart));
        }
        return whiteness;
    }

    /**
     * Get the genotype color of the hare
     * @returns {string} the hex color of the hare's genotype
     */
    getGenotypeColor() {
        // mix the colors of the coat alleles
        const coatAlleles = this.alleles.filter((allele) => allele.type === "coat");
        const colors = coatAlleles.map((allele) => convertHexToRGB(allele.geneColor));
        
        if (colors.length === 0) {
            return "#000000";
        }
        const averageColor = colors.reduce((acc, color) => {
            acc.r += color.r;
            acc.g += color.g;
            acc.b += color.b;
            return acc;
        }, { r: 0, g: 0, b: 0 });

        for (const key in averageColor) {
            averageColor[key] = Math.floor(averageColor[key] / colors.length);
        }
        // return as hex
        const rgbValToHex = (val) => val.toString(16).padStart(2, "0");
        return `#${rgbValToHex(averageColor.r)}${rgbValToHex(averageColor.g)}${rgbValToHex(averageColor.b)}`;
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
