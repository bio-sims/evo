/**
 * @file Class definitions for determining when a generation should occur
 * @author Zachary Mullen
 * @module generation
 * @typedef { import("../../types/generation").GenerationGenerator }
 */

/**
 * @param {number} week - The current week of the simulation
 * @implements {GenerationGenerator}
 */
class GenerateEvery18Weeks {
    constructor(week) {
        this.week = week;
    }
    advanceWeek() {
        this.week++;
    }
    shouldGenerate() {
        return this.week % 18 === 0;
    }
}


export {
    GenerateEvery18Weeks,
}
