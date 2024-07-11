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
        this.friendlyName = "Integral Stable";
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
 */
class IntegralWarmingClimate {
    constructor(week, temperature) {
        this.week = week;
        this.temperature = temperature;
        this.friendlyName = "Integral Warming";
        this.initialSnowlessYearWeek = Math.floor(Math.random() * 2) + 30;
        this.currentSnowlessYearWeek = this.initialSnowlessYearWeek;
        this.snowWeek = 36;
        this.updateTemperature();
    }
    updateTemperature() {
        const yearWeek = this.week % 52;
        // choose a new snowless week if it is the start of the year
        let changeChance;
        let increaseChance;
        if (this.currentSnowlessYearWeek < 20) {
            changeChance = 0.9;
            increaseChance = 0.2;
        } else if (this.currentSnowlessYearWeek < 10) {
            changeChance = 0.5;
            increaseChance = 0.5;
        } else {
            changeChance = 0.85;
            increaseChance = 0.1;
        }
        if (yearWeek === 0 && Math.random() < changeChance) {
            if (Math.random() < increaseChance) {
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

// https://www.desmos.com/calculator/5hkioodkx6
class RealisticStableClimate {
    constructor(week, temperature) {
        this.week = week;
        this.temperature = temperature;
        this.friendlyName = "Realistic Stable";
        this.tempRange = 11;
        this.tempOffset = 1;
        // choose between 0 and 6
        this.originalWeekOffset = Math.floor(Math.random() * 7);
        this.weekOffset = this.originalWeekOffset;
        this.updateTemperature();
    }

    updateTemperature() {
        if (this.week % 52 === 0) {
            // update weekoffset +/- 1 of the original offset at the start of the year
            this.weekOffset = this.originalWeekOffset + Math.floor(Math.random() * 3) - 1;
        }
        const period = (2 * Math.PI * (this.week + this.weekOffset)) / 52;
        this.temperature = -11 * Math.sin(period + Math.pow(Math.cos(period / 2), 2)) + this.tempOffset;
    }

    advanceWeek() {
        this.week++;
        this.updateTemperature();
    }

    // snow percentage is a function of temperature
    getSnowCoverage() {
        const snow = 1 / (1 + Math.exp(0.7 * (this.temperature + 2)));
        if (snow < 0.01) {
            return 0;
        }
        return snow;
    }
}

class RealisticWarmingClimate {
    constructor(week, temperature) {
        this.week = week;
        this.temperature = temperature;
        this.friendlyName = "Realistic Warming";
        this.tempRange = 11;
        this.tempOffset = 1;
        // float between -2 and -1
        this.originalWeekOffset = -1 - Math.random();
        this.weekOffset = this.originalWeekOffset;
        this.updateTemperature();
    }

    updateTemperature() {
        if (this.week % 52 === 0) {
            if (Math.random() < 0.2) {
                // randomly increase or decrease by 0.25
                if (Math.random() < 0.5) {
                    this.weekOffset = Math.max(0, this.weekOffset - 0.5);
                } else {
                    this.weekOffset = Math.min(10, this.weekOffset + 0.5);
                }
            } else {
                if (Math.random() < 0.25) {
                    this.weekOffset = Math.max(0, this.weekOffset - 0.25);
                } else {
                    this.weekOffset = Math.min(10, this.weekOffset + 0.5);
                }
            }
        }
        const period = (2 * Math.PI * (this.week + this.weekOffset)) / 52;
        this.temperature = -11 * Math.sin(period + Math.pow(Math.cos(period / 2), 2)) + this.tempOffset;
    }

    advanceWeek() {
        this.week++;
        this.updateTemperature();
    }

    // snow percentage is a function of temperature
    getSnowCoverage() {
        const snow = 1 / (1 + Math.exp(0.7 * (this.temperature + 2)));
        if (snow < 0.01) {
            return 0;
        }
        return snow;
    }
}

export {
    IntegralStableClimate,
    IntegralWarmingClimate,
    RealisticStableClimate,
    RealisticWarmingClimate,
};
