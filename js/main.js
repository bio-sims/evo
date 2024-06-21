/**
 * @file Main entry point for the simulation application
 * @author Zachary Mullen
 * @module main
 */

import { Chart, LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm';
Chart.register(LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip);
import { Simulation } from "./modules/simulation.js";
import { simulationConfig } from '../sim.config.js';

let scenarios = simulationConfig.scenarios;
let selectedScenarioIndex = 0;
let currentConfig = scenarios[selectedScenarioIndex].options;
const climateFunctions = [...new Set(scenarios.map((scenario) => scenario.options.calculateSnowCoverage))];
const generationFunctions = [...new Set(scenarios.map((scenario) => scenario.options.shouldGenerateNewPopulation))];

let alleleLineChart = null;

/**
 * @type {Simulation|null}
*/
let simulation = null;

function getColorHue(index) {
    return (index / simulation.availableAlleles.length) * 360;
}

function graphSetup() {
    if (!simulation) return;
    if (alleleLineChart) alleleLineChart.destroy();
    const initialFrequency = simulation.getCoatAlleleFrequency();
    const ctx = document.getElementById('allele-line-chart');
    const data = {
        labels: Array.from({ length: 52 }, (_, i) => i + 1 + simulation.week),
        // make a dataset with the initial allele frequencies
        datasets: Object.keys(initialFrequency).map((alleleId, i) => {
            const allele = simulation.availableAlleles.find((allele) => allele.id === parseInt(alleleId));
            return {
                id: alleleId,
                label: `${allele.name}`,
                data: [initialFrequency[alleleId]],
                borderColor: `hsla(${getColorHue(i)}, 100%, 50%, 1)`,
                backgroundColor: `hsla(${getColorHue(i)}, 100%, 50%, 0.5)`,
                fill: false,
            };
        }),
    }

    alleleLineChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Week',
                    },
                },
                y: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Frequency',
                    },
                    min: 0,
                    max: 1,
                },
            },
            plugins: {
                legend: {
                    display: true,
                    text: 'Relative Allele Frequency',
                },
                tooltip: {
                    callbacks: {
                        "title": (context) => `Week ${context[0].label}`,
                    }
                },
            },
        },
    });
}

function updateGraphData(refresh = false) {
    // add the current allele frequencies to the chart
    if (!simulation) return;
    const currentFrequency = simulation.getCoatAlleleFrequency();
    for (const dataset of alleleLineChart.data.datasets) {
        dataset.data.push(currentFrequency[dataset.id]);
    }
    // if the next week causes the chart to exceed the x-axis, add a new label
    if (alleleLineChart.data.labels.length < simulation.week + 1) {
        alleleLineChart.data.labels.push(simulation.week);
    }
    // dont render points beyond a certain threshold to aid performance
    if (alleleLineChart.data.labels.length > 512) {
        alleleLineChart.options.spanGaps = true;
        alleleLineChart.options.datasets.line.pointRadius = 0;
        alleleLineChart.options.elements.point.radius = 0;
    }
    if (refresh) {
        alleleLineChart.update();
    }
}

function replaceSimulation() {
    simulation = new Simulation(currentConfig);
    window.simulation = simulation; // temp
    graphSetup();
}

function updateScenario() {
    currentConfig = scenarios[selectedScenarioIndex].options;
    // set all form values to the current scenario
    const form = document.getElementById('config-form');
    form.elements['carrying-capacity'].value = currentConfig.carryingCapacity;
    form.elements['base-survival-rate'].value = currentConfig.baseSurvivalRate;
    form.elements['mismatch-penalty'].value = currentConfig.mismatchPenalty;
    form.elements['selection'].checked = currentConfig.selection;
    form.elements['start-week'].value = currentConfig.startWeek;

    // set initial values for the output fields, will be properly updated on input change
    form.elements['base-survival-rate-output'].value = currentConfig.baseSurvivalRate;
    form.elements['mismatch-penalty-output'].value = currentConfig.mismatchPenalty;

    // similarly, determine if the mismatch penalty input should be disabled
    form.elements['mismatch-penalty'].disabled = !currentConfig.selection;

    // set the climate and generation functions, matching by name
    const climateSelect = form.elements['climate-function'];
    const generationSelect = form.elements['generation-function'];
    climateSelect.value = climateFunctions.findIndex((fn) => fn.name === currentConfig.calculateSnowCoverage.name);
    generationSelect.value = generationFunctions.findIndex((fn) => fn.name === currentConfig.shouldGenerateNewPopulation.name);

    replaceSimulation()
}

function main() {
    updateScenario();

    // define basic preset element
    const presetElement = document.createElement('div');
    presetElement.classList.add('preset-entry');
    presetElement.innerHTML = `
        <h3 class="preset-name"></h3>
        <p class="preset-description"></p>
    `;
    // add all presets to the div
    const presetsContainer = document.getElementById('preset-container');
    for (let i = 0; i < scenarios.length; i++) {
        const preset = scenarios[i];
        const presetClone = presetElement.cloneNode(true);
        presetClone.querySelector('.preset-name').textContent = preset.name;
        presetClone.querySelector('.preset-description').textContent = preset.description;
        presetClone.addEventListener('click', () => {
            // remove --selected from all presets
            for (const preset of presetsContainer.children) {
                preset.classList.remove('preset-entry--selected');
            }
            // add --selected to the clicked preset
            presetClone.classList.add('preset-entry--selected');
            selectedScenarioIndex = i;
            updateScenario();
        });
        if (i === selectedScenarioIndex) {
            presetClone.classList.add('preset-entry--selected');
        }
        presetsContainer.appendChild(presetClone);
    }

    const advanceSimulation = () => {
        simulation.advanceWeek();
        updateGraphData(true);
    };

    const toggleGraphStack = () => {
        alleleLineChart.options.scales.y.stacked = !alleleLineChart.options.scales.y.stacked;
        for (const dataset of alleleLineChart.data.datasets) {
            dataset.fill = alleleLineChart.options.scales.y.stacked ? '-1' : false;
        }
        // set first dataset fill to origin
        alleleLineChart.data.datasets[0].fill = alleleLineChart.options.scales.y.stacked ? 'origin' : false;
        alleleLineChart.update();
    }

    document.getElementById('advance-week').addEventListener('click', advanceSimulation);
    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
    document.getElementById('advance-10-years').addEventListener('click', () => {
        for (let i = 0; i < 520; i++) {
            simulation.advanceWeek();
            updateGraphData();
        }
        alleleLineChart.update();
    });

    // --- form events ---

    // tie form submission to simulation update

    const form = document.getElementById('config-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const carryingCapacity = parseInt(formData.get('carrying-capacity'));
        const baseSurvivalRate = parseFloat(formData.get('base-survival-rate'));
        const mismatchPenalty = parseFloat(formData.get('mismatch-penalty'));
        const selection = formData.get('selection') === 'on';
        const startWeek = parseInt(formData.get('start-week'));
        // add drop down for available alleles that can be selected from the scenarios? maybe
        const newConfig = {
            carryingCapacity,
            baseSurvivalRate,
            mismatchPenalty,
            selection,
            startWeek,
            availableAlleles: simulation.availableAlleles,
            calculateSnowCoverage: simulationConfig.scenarios[selectedScenarioIndex].options.calculateSnowCoverage,
            shouldGenerateNewPopulation: simulationConfig.scenarios[selectedScenarioIndex].options.shouldGenerateNewPopulation,
        };
        currentConfig = newConfig;
        replaceSimulation()

        // deselect all presets
        for (const preset of presetsContainer.children) {
            preset.classList.remove('preset-entry--selected');
        }
    });

    // if selection is not selected, disable the mismatch penalty input
    form.elements['selection'].addEventListener('change', (event) => {
        form.elements['mismatch-penalty'].disabled = !event.target.checked;
    });

    // get a list of all unique climate and generation functions from the scenarios, eventually this will be pre-configured
    const climateSelect = form.elements['climate-function'];
    const generationSelect = form.elements['generation-function'];

    for (let i = 0; i < climateFunctions.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = climateFunctions[i].name;
        climateSelect.appendChild(option);
    }

    for (let i = 0; i < generationFunctions.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = generationFunctions[i].name;
        generationSelect.appendChild(option);
    }
}

main();
