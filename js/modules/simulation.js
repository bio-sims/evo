/**
 * @file Simulation class definition
 * @author Zachary Mullen
 * @module simulation
 * @typedef { import("../../types/climate").ClimateGenerator }
 * @typedef { import("../../types/generation").GenerationGenerator }
 */

import { Hare } from "./hare.js";
import { IntegralStableClimate } from "./climate.js";
import { GenerateEvery18Weeks } from "./generation.js";

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
        this.availableAlleles = simulationConfig.availableAlleles ?? [];
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
         * The class to generate climate data for the simulation
         * @type {ClimateGenerator}
         */
        this.climateGenerator = simulationConfig.climateGenerator ?? new IntegralStableClimate(this.week, 0);
        /**
         * The class to determine when a generation should occur
         * @type {GenerationGenerator}
         */
        this.generationGenerator = simulationConfig.generationGenerator ?? new GenerateEvery18Weeks(this.week);
        /**
         * The current population of hares in the simulation
         * @type {Array<Hare>}
         */
        this.hares = this.getInitialPopulation();
        /**
         * The available ids for hares in the simulation
         * @type {Array<number>}
         */
        this.availableIds = [];
        /**
         * The number of generations that have occurred in the simulation
         * @type {number}
         */
        this.generation = 1;

        // disable penalty if simulationConfig.selection is false
        if (!simulationConfig.selection) {
            this.mismatchPenalty = 0;
        }
        this.snowCoverage = this.climateGenerator.getSnowCoverage();
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
            const newHare = new Hare(0, alleles, i);
            newHare.whiteness = newHare.getProjectedWhiteness(this.week);
            hares.push(newHare);
        }
        return hares;
    }

    /**
     * Generates a population of hares for the simulation with random alleles based on the current population
     * @returns {boolean} true if the population was successfully generated, false otherwise (wiped out population)
     */
    doProcreation() {
        // remove dead hares and add their ids back to the available pool
        this.hares = this.hares.filter((hare) => {
            if (!hare.alive) {
                this.availableIds.push(hare.id);
            }
            return hare.alive;
        });
        // do not populate if there are no hares to breed
        if (this.hares.length === 0) {
            return false;
        }
        // get every allele for every hare in the population including duplicates
        const allelePool = this.hares.flatMap((hare) => hare.alleles);
        // fill the population with new hares by randomly selecting alleles from the pool
        for (let i = this.hares.length - 1; i < this.carryingCapacity - 1; i++) {
            const alleles = [];
            for (let j = 0; j < 2; j++) {
                alleles.push(allelePool[Math.floor(Math.random() * allelePool.length)]);
            }
            const newHare = new Hare(0, alleles, this.availableIds.pop());
            newHare.whiteness = newHare.getProjectedWhiteness(this.week);
            this.hares.push(newHare);
        }
        this.generation++;
        return true;
    }

    /**
     * Advances the simulation by one week
     */
    advanceWeek() {
        this.climateGenerator.advanceWeek();
        this.generationGenerator.advanceWeek();
        this.snowCoverage = this.climateGenerator.getSnowCoverage();
        this.week++;
        if (this.hares.length === 0) {
            return;
        }
        if (this.generationGenerator.shouldGenerate()) {
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
    }

    getPossibleCoatAlleles() {
        return this.availableAlleles.filter((allele) => allele.type === "coat");
    }

    getAliveHares() {
        return this.hares.filter((hare) => hare.alive);
    }

    /**
     * Calculate the relative frequency of each coat allele in the population
     */
    getCoatAlleleFrequency() {
        const aliveHares = this.getAliveHares();
        const popAlleles = aliveHares.flatMap((hare) => hare.alleles);
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
            if (coatAlleles.length === 0) {
                alleleFrequency[allele.id] = 0;
            } else {
                alleleFrequency[allele.id] /= coatAlleles.length;
            }
        }

        return alleleFrequency;
    }
}
