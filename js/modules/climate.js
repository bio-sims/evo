/**
 * @file Class definitions for climate generators
 * @author Zachary Mullen
 * @module climate
 * @typedef { import("../../types/climate").ClimateGenerator }
 */

/**
 * @implements {ClimateGenerator}
 * @param {number} week - The current week of the simulation
 * @param {number} temperature - The current temperature of the simulation
 */
class IntegralStableClimate {
    constructor(week, temperature) {
        this.week = week;
        this.temperature = temperature;
        // random number between 21 and 28
        this.baseSnowlessYearWeek = Math.floor(Math.random() * 8) + 21;
        this.currentSnowlessYearWeek = this.baseSnowlessYearWeek;
        this.snowWeek = 36;
        this.updateTemperature();
    }

    updateTemperature() {
        const yearWeek = this.week % 52;
        // if start of year, choose a random week within a delta of 1 week of the base week
        if (yearWeek === 0) {
            const delta = Math.floor(Math.random() * 3) - 1;
            this.currentSnowlessYearWeek = this.baseSnowlessYearWeek + delta
        }
        // set the temperature to 0 if it is between the snowless week and the snow week
        if (yearWeek < this.currentSnowlessYearWeek || yearWeek >= this.snowWeek) {
            this.temperature = 0;
        } else {
            this.temperature = 10;
        }
    }

    advanceWeek() {
        this.week++;
        this.updateTemperature();
    }

    getSnowCoverage() {
        return this.temperature < 1 ? 1 : 0;
    }
};

/**
 * @implements {ClimateGenerator}
 * @param {number} week - The current week of the simulation
 * @param {number} temperature - The current temperature of the simulation
 * @todo Implement variable climate logic
 */
class IntegralVariableClimate {
    constructor(week, temperature) {
        this.week = week;
        this.temperature = temperature;
        this.initialSnowlessYearWeek = Math.floor(Math.random() * 2) + 28;
        this.currentSnowlessYearWeek = this.initialSnowlessYearWeek;
        this.snowWeek = 36;
        this.updateTemperature();
    }
    updateTemperature() {
        const yearWeek = this.week % 52;
        // choose a new snowless week if it is the start of the year
        // have a 50% chance of changing the snowless week until the week has drifted to week 15
        let changeChance;
        if (this.currentSnowlessYearWeek < 15) {
            changeChance = 0.25;
        } else if (this.currentSnowlessYearWeek < 10) {
            changeChance = 0.05;
        } else {
            changeChance = 0.5;
        }
        if (yearWeek === 0 && Math.random() < changeChance) {
            // have a 20% chance of increasing the snowless week
            if (Math.random() < 0.2) {
                this.currentSnowlessYearWeek = Math.min(51, this.currentSnowlessYearWeek + 1);
            } else {
                this.currentSnowlessYearWeek = Math.max(0, this.currentSnowlessYearWeek - 1);
            }
        }
        if (yearWeek < this.currentSnowlessYearWeek || yearWeek >= this.snowWeek) {
            this.temperature = 0;
        } else {
            this.temperature = 10;
        }
    }
    advanceWeek() {
        this.week++;
        this.updateTemperature();
    }
    getSnowCoverage() {
        return this.temperature < 1 ? 1 : 0;
    }
};

export {
    IntegralStableClimate,
    IntegralVariableClimate,
};
