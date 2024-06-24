/**
 * @file Main entry point for the simulation application
 * @author Zachary Mullen
 * @module main
 * @typedef { import("../../types/climate").ClimateGenerator }
 */

import { Chart, LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm';
Chart.register(LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip);
import { Simulation } from "./modules/simulation.js";
import configFile from "../sim.config.js";
import { IntegralStableClimate, IntegralVariableClimate } from "./modules/climate.js";
import { GenerateEvery18Weeks } from "./modules/generation.js";

function getColorHue(index) {
    return (index / simulation.availableAlleles.length) * 360;
}

// --- module scoped variables ---

let alleleSets = configFile.alleleSets;
let scenarios = configFile.scenarios;
let selectedScenarioIndex = 0;
let currentConfig = scenarios[selectedScenarioIndex].options;
const climateFunctions = {
    IntegralStableClimate: new IntegralStableClimate(0, 0),
    IntegralVariableClimate: new IntegralVariableClimate(0, 0),
}
const generationFunctions = {
    GenerationEvery18Weeks: new GenerateEvery18Weeks(0),
}
// replace the string names with the actual functions
for (const scenario of scenarios) {
    scenario.options.climateGenerator = climateFunctions[scenario.options.climateGenerator];
    scenario.options.generationGenerator = generationFunctions[scenario.options.generationGenerator];
}
// replace any string names in scenario's available alleles with the actual objects
for (const scenario of scenarios) {
    if (typeof scenario.options.availableAlleles === 'string') {
        scenario.options.availableAlleles = alleleSets[scenario.options.availableAlleles];
    }
}

// graph related data initialization

let weekLabels = Array.from({ length: 52 }, (_, i) => i + 1);
let yearLabels = Array.from({ length: 10 }, (_, i) => i + 1);
let alleleLineChart = null;
let snowLineChart = null;
let rawSnowData = [];
let rawFirstSnowlessWeekData = [];


// graph configurations

const alleleGraph = {
    type: 'line',
    data: null,
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
}


const snowGraphWeekly = {
    type: 'line',
    data: {
        labels: weekLabels,
        datasets: [
            {
                label: "Snow coverage",
                data: rawSnowData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                fill: true,
            }
        ]
    },
    options: {
        currentGraph: 'weekly',
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
                title: {
                    display: true,
                    text: 'Snow Coverage',
                },
                min: 0,
                max: 1,
            },
        },
        plugins: {
            tooltip: {
                callbacks: {
                    "title": (context) => `Week ${context[0].label}`,
                }
            },
        },
    },
}

const snowGraphYearly = {
    type: 'line',
    data: {
        labels: yearLabels,
        datasets: [
            {
                label: "First Snowless Week",
                data: rawFirstSnowlessWeekData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                fill: true,
            }
        ]
    },
    options: {
        currentGraph: 'yearly',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'First Snowless Week',
                },
                min: 0,
                max: 52,
            },
        },
        plugins: {
            tooltip: {
                callbacks: {
                    "title": (context) => `Year ${context[0].label}`,
                }
            },
        },
    },
}

/**
 * @type {Simulation|null}
*/
let simulation = null;


function graphSetup() {
    if (!simulation) return;
    // reset label lenghts to the original values
    weekLabels.length = 52;
    yearLabels.length = 10;

    // frequency graph

    if (alleleLineChart) alleleLineChart.destroy();
    const initialFrequency = simulation.getCoatAlleleFrequency();
    const alleleCtx = document.getElementById('allele-line-chart');
    const alleleData = {
        labels: weekLabels,
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
    };

    // ensure the graph is not stacked
    alleleGraph.options.scales.y.stacked = false;
    alleleLineChart = new Chart(alleleCtx, alleleGraph);
    alleleLineChart.data = alleleData;
    alleleLineChart.update();
    // snow graph

    if (snowLineChart) snowLineChart.destroy();
    const snowCtx = document.getElementById('snow-chart');
    // set length to 0 to keep reference to the same array
    rawSnowData.length = 0;
    rawFirstSnowlessWeekData.length = 0;
    rawSnowData.push(simulation.snowCoverage);

    snowLineChart = new Chart(snowCtx, snowGraphYearly);
}

function updateLabels() {
    if (!simulation) return;
    const currentWeek = simulation.week;
    const currentYear = Math.floor(currentWeek / 52);
    if (weekLabels.length <= currentWeek) {
        weekLabels.push(currentWeek);
    }
    if (yearLabels.length < currentYear) {
        yearLabels.push(currentYear);
    }
}

function updateFreqGraphData(refresh = false) {
    // add the current allele frequencies to the chart
    if (!simulation) return;
    updateLabels();
    const currentFrequency = simulation.getCoatAlleleFrequency();
    for (const dataset of alleleLineChart.data.datasets) {
        dataset.data.push(currentFrequency[dataset.id]);
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

function updateSnowGraphData(refresh = false) {
    if (!simulation) return;
    updateLabels();
    rawSnowData.push(simulation.snowCoverage);
    // this assumes that snow coverage being 0 is the first snowless week
    const year = Math.floor(simulation.week / 52);
    const week = simulation.week % 52;
    if (simulation.snowCoverage === 0 && rawFirstSnowlessWeekData.length < year + 1) {
        rawFirstSnowlessWeekData.push(week);
    }
    if (snowLineChart.data.labels.length > 512) {
        snowLineChart.options.spanGaps = true;
        snowLineChart.options.datasets.line.pointRadius = 0;
        snowLineChart.options.elements.point.radius = 0;
    }
    if (refresh) {
        snowLineChart.update();
    }
}

function replaceSimulation() {
    simulation = new Simulation(currentConfig);
    window.simulation = simulation; // temp
    graphSetup();
}

function updateScenario() {
    // recreate the climate generators since they may have random elements
    for (const [key, value] of Object.entries(climateFunctions)) {
        climateFunctions[key] = new value.constructor(0, 0);
    }
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
    // find the index based on the constructor name
    climateSelect.value = Object.keys(climateFunctions).find((key) => climateFunctions[key].constructor.name === currentConfig.climateGenerator.constructor.name);
    generationSelect.value = Object.keys(generationFunctions).find((key) => generationFunctions[key].constructor.name === currentConfig.generationGenerator.constructor.name);

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
        updateFreqGraphData(true);
        updateSnowGraphData(true);
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

    // toggle between snow per week and first snowless week
    const toggleSnowData = () => {
        if (snowLineChart.options.currentGraph === 'weekly') {
            snowLineChart.destroy();
            snowLineChart = new Chart(document.getElementById('snow-chart'), snowGraphYearly);
        } else {
            snowLineChart.destroy();
            snowLineChart = new Chart(document.getElementById('snow-chart'), snowGraphWeekly);
        }
    }


    document.getElementById('advance-week').addEventListener('click', advanceSimulation);
    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
    document.getElementById('advance-10-years').addEventListener('click', () => {
        for (let i = 0; i < 520; i++) {
            simulation.advanceWeek();
            updateFreqGraphData();
            updateSnowGraphData();
        }
        alleleLineChart.update();
        snowLineChart.update();
    });
    document.getElementById('toggle-snow-data').addEventListener('click', toggleSnowData);

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
        const climateFunctionKey = formData.get('climate-function');
        const generationFunctionKey = formData.get('generation-function');
        // add drop down for available alleles that can be selected from the scenarios? maybe
        const newConfig = {
            carryingCapacity,
            baseSurvivalRate,
            mismatchPenalty,
            selection,
            startWeek,
            availableAlleles: simulation.availableAlleles,
            climateGenerator: climateFunctions[climateFunctionKey],
            generationGenerator: generationFunctions[generationFunctionKey],
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

    const climateSelect = form.elements['climate-function'];
    const generationSelect = form.elements['generation-function'];

    for (const [key, value] of Object.entries(climateFunctions)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.constructor.name;
        climateSelect.appendChild(option);
    }

    for (const [key, value] of Object.entries(generationFunctions)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.constructor.name;
        generationSelect.appendChild(option);
    }
    // --- tab events ---

    const tabs = document.querySelectorAll('.tab');
    for (const tab of tabs) {
        tab.addEventListener('click', () => {
            const tabContent = document.getElementById(tab.dataset.tab);
            if (!tabContent) return;
            // get the group and its current active tab/content
            const tabGroup = tab.dataset.group;
            const activeTab = document.querySelector(`.tab--active[data-group="${tabGroup}"]`);
            const activeTabContent = document.getElementById(activeTab.dataset.tab);
            if (!activeTab || !activeTabContent) return;
            // move the active class to the clicked tab and its content
            activeTab.classList.remove('tab--active');
            activeTabContent.classList.remove('card--active');
            tab.classList.add('tab--active');
            tabContent.classList.add('card--active');
        });
    }
}

main();
