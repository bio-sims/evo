/**
 * @file Simulation class definition
 * @author Zachary Mullen
 * @module simulation
 */

import { Hare } from "./hare.js";

export class Simulation {
    /**
     * Represents a simulation
     * @param {Object} simulationConfig - configuration for the simulation to avoid long parameter list
     * @todo Use JSON configured defaults for simulationConfig? Could be either passed in or loaded here
     */
    constructor(simulationConfig) {
        /**
         * The current week of the simulation
         * @type {number}
         */
        this.week = simulationConfig.startWeek ?? 0;
        /**
         * The available alleles for hares in the simulation
         * @type {Array<Object>}
         */
        this.availableAlleles = simulationConfig.availableAlleles;
        /**
         * Maximum number of hares that can be in the simulation
         * @type {number}
         */
        this.carryingCapacity = simulationConfig.carryingCapacity ?? 20;
        /**
         * The base survival rate for hares in the simulation
         * @type {number}
         */
        this.baseSurvivalRate = simulationConfig.baseSurvivalRate ?? 0.96;
        /**
         * The penalty for mismatched hares in the simulation. If 0, selection is disabled.
         * @type {number}
         */
        this.mismatchPenalty = simulationConfig.mismatchPenalty ?? 0.07;
        /**
         * Current snow coverage for the simulation
         * @type {number}
         */
        this.snowCoverage = 0;
        /**
         * The function to determine the snow coverage for a given week
         * @function
         * @param {number} week - the week to determine snow coverage for
         * @returns {number} the snow coverage for the given week
         * @todo Replace with object-based dependency injection
         */
        this.calculateSnowCoverage =
            simulationConfig.calculateSnowCoverage ?? ((week) => 0.5);
        /**
         * The function to determine when a generation should occur
         * @function
         * @param {number} week - the week to determine if a generation should occur
         * @returns {boolean} true if a generation should occur, false otherwise
         * @todo Replace with object-based dependency injection
         */
        this.shouldGenerate =
            simulationConfig.shouldGenerate ?? ((week) => week % 18 === 0);
        /**
         * The current population of hares in the simulation
         * @type {Array<Hare>}
         */
        this.hares = simulationConfig.hares ?? this.getInitialPopulation();
    }

    /**
     * Generates a population of hares for the simulation with equal numbers of each allele (as possible)
     * @returns {Array<Hare>}
     */
    getInitialPopulation() {
        const hares = [];
        // round robin through the available alleles to ensure an even distribution (2 per hare)
        for (let i = 0; i < this.carryingCapacity; i++) {
            const alleles = [
                this.availableAlleles[i % this.availableAlleles.length],
                this.availableAlleles[(i + 1) % this.availableAlleles.length],
            ];
            const newHare = new Hare(0, alleles);
            newHare.whiteness = newHare.getProjectedWhiteness(this.week);
            hares.push(newHare);
        }
        return hares;
    }

    /**
     * Generates a population of hares for the simulation with random alleles based on the current population
     */
    doProcreation() {
        // get every allele for every hare in the population including duplicates
        const allelePool = this.hares.flatMap((hare) => hare.alleles);
        // fill the population with new hares by randomly selecting alleles from the pool
        for (let i = this.hares.length - 1; i < this.carryingCapacity; i++) {
            const alleles = [];
            for (let j = 0; j < 2; j++) {
                alleles.push(allelePool[Math.floor(Math.random() * allelePool.length)]);
            }
            const newHare = new Hare(0, alleles);
            newHare.whiteness = newHare.getProjectedWhiteness(this.week);
            this.hares.push(newHare);
        }
    }

    /**
     * Advances the simulation by one week
     */
    advanceWeek() {
        this.snowCoverage = this.calculateSnowCoverage(this.week);
        if (this.hares.length === 0) {
            this.week++;
            return;
        }
        if (this.shouldGenerate(this.week)) {
            this.doProcreation();
        }
        this.hares.forEach((hare) => {
            hare.doSurvivalPass(
                this.baseSurvivalRate,
                this.mismatchPenalty,
                this.snowCoverage,
                this.week
            );
        });
        // remove dead hares
        this.hares = this.hares.filter((hare) => hare.alive);
        this.week++;
    }

    getPossibleCoatAlleles() {
        return this.availableAlleles.filter((allele) => allele.type === "coat");
    }

    /**
     * Calculate the relative frequency of each coat allele in the population
     */
    getCoatAlleleFrequency() {
        const popAlleles = this.hares.flatMap((hare) => hare.alleles);
        const coatAlleles = popAlleles.filter((allele) => allele.type === "coat");

        // make a json object with all the possible coat alleles
        const alleleFrequency = {};
        for (const allele of this.getPossibleCoatAlleles()) {
            alleleFrequency[allele.id] = 0;
        }

        // count the number of each allele in the population
        for (const allele of coatAlleles) {
            alleleFrequency[allele.id]++;
        }

        // divide by the total number of alleles to get the relative frequency
        for (const allele of this.getPossibleCoatAlleles()) {
            alleleFrequency[allele.id] /= coatAlleles.length;
        }

        return alleleFrequency;
    }
}
