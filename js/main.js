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
import { makeAlleleGraphConfig, makeSnowGraphConfig } from './modules/graphs.js';
import { IntegralStableClimate, IntegralVariableClimate } from "./modules/climate.js";
import { GenerateEvery18Weeks } from "./modules/generation.js";
import hareGrid from "./modules/grid.js";

function getColorHue(index) {
    return (index / simulation.availableAlleles.length) * 360;
}

// --- module scoped variables ---

let alleleSets = configFile.alleleSets;
let scenarios = configFile.scenarios;
let selectedScenarioIndex = 0;
// copy with spread operator to avoid modifying the original
let climateFunctions = {
    IntegralStableClimate: new IntegralStableClimate(0, 0),
    IntegralVariableClimate: new IntegralVariableClimate(0, 0),
}
let generationFunctions = {
    GenerationEvery18Weeks: new GenerateEvery18Weeks(0),
}
let currentConfig = { ...scenarios[selectedScenarioIndex].options };
// replace any string names in scenario's available alleles with the actual objects
for (const scenario of scenarios) {
    if (typeof scenario.options.availableAlleles === 'string') {
        scenario.options.availableAlleles = alleleSets[scenario.options.availableAlleles];
    }
}

// --- chart.js global configuration ---
Chart.defaults.elements.point.hitRadius = 8;

// globals related to simulation control

let advanceRateValue = 1;
let advanceRateType = 'weeks';
let currentInterval = null;
let populationWiped = false;
let doEndCondition = false;
let endConditionValue = 1;
let playRate = 250;

// graph related data initialization

let weekLabels = Array.from({ length: 52 }, (_, i) => i);
let yearLabels = Array.from({ length: 10 }, (_, i) => i);
let newGenerationWeeks = [];
let isSnowLineChartYearly = true;
let isAlleleGraphPerGeneration = false;
let isAlleleGraphArea = false;
let alleleGraphDatasets = [];
let rawSnowData = [];
let rawFirstSnowlessWeekData = [];

let alleleLineChart = null;
let snowLineChart = null;
let genotypeGrid = null;

/**
 * @type {Simulation|null}
*/
let simulation = null;
let currentTab = 'frequency-graph';
let weatherBar = null;

function graphSetup() {
    if (!simulation) return;
    // set 52 weeks from the current week as the initial
    weekLabels = Array.from({ length: 52 }, (_, i) => i + simulation.week);
    yearLabels = Array.from({ length: 10 }, (_, i) => i + Math.floor(simulation.week / 52));
    newGenerationWeeks = [];
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
                borderColor: allele.geneColor ?? `hsla(${getColorHue(i)}, 100%, 50%, 1)`,
                backgroundColor: allele.geneColor ? `${allele.geneColor}80` : `hsla(${getColorHue(i)}, 100%, 50%, 0.5)`,
                fill: false,
            };
        }),
    };
    alleleGraphDatasets = alleleData.datasets;
    const alleleGraph = makeAlleleGraphConfig(weekLabels,
                                              alleleGraphDatasets,
                                              isAlleleGraphPerGeneration,
                                              newGenerationWeeks,
                                              isAlleleGraphArea);
    alleleLineChart = new Chart(alleleCtx, alleleGraph);
    // snow graph

    if (snowLineChart) snowLineChart.destroy();
    const snowCtx = document.getElementById('snow-chart');
    rawSnowData = [simulation.snowCoverage];
    rawFirstSnowlessWeekData = [];
    const graphConfig = makeSnowGraphConfig(isSnowLineChartYearly ? yearLabels : weekLabels,
                                            isSnowLineChartYearly ? rawFirstSnowlessWeekData : rawSnowData,
                                            isSnowLineChartYearly);
    snowLineChart = new Chart(snowCtx, graphConfig);
}

function updateLabels() {
    if (!simulation) return;
    const currentWeek = simulation.week;
    const currentYear = Math.floor(currentWeek / 52);
    if (weekLabels.length <= currentWeek - currentConfig.startWeek) {
        weekLabels.push(currentWeek);
    }
    // if the starting week was past when the snowless week was recorded
    if (currentWeek % 52 === 0 && rawFirstSnowlessWeekData.length < currentYear) {
        rawFirstSnowlessWeekData.push(null);
    }
    if (yearLabels.length < currentYear - Math.floor(currentConfig.startWeek / 52)) {
        yearLabels.push(currentYear);
    }
}

// TODO: lots of reused logic between graph updaters, consider abstracting

function updateFreqGraphData(refresh = false) {
    // only refresh if the tab is active
    refresh = refresh && currentTab === 'frequency-graph';
    // add the current allele frequencies to the chart
    if (!simulation) return;
    updateLabels();
    const currentFrequency = simulation.getCoatAlleleFrequency();
    for (const dataset of alleleGraphDatasets) {
        dataset.data.push(currentFrequency[dataset.id]);
    }
    // dont render points beyond a certain threshold to aid performance
    if (alleleLineChart.data.labels.length > 512) {
        alleleLineChart.options.spanGaps = true;
        alleleLineChart.options.datasets.line.pointRadius = 0;
        alleleLineChart.options.elements.point.radius = 0;
        alleleLineChart.options.animation = false;
    }
    if (refresh) {
        alleleLineChart.update();
    }
}

function updateSnowGraphData(refresh = false) {
    // only refresh if the tab is active
    refresh = refresh && currentTab === 'snow-graph';
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
        snowLineChart.options.animation = false;
    }
    if (refresh) {
        snowLineChart.update();
    }
}

function updateWeatherBar() {
    if (!simulation) return;
    weatherBar.style.backgroundColor = `hsla(37, 100%, ${30 + (70 * simulation.snowCoverage)}%, 1)`;
    weatherBar.style.color = simulation.snowCoverage > 0.5 ? 'black' : 'white';
    weatherBar.textContent = `Snow Coverage: ${Math.round(simulation.snowCoverage * 100)}%`;
}

function updateStatusPanel() {
    if (!simulation) return;
    document.getElementById('current-year-info').textContent = Math.floor(simulation.week / 52);
    document.getElementById('current-week-info').textContent = simulation.week % 52;
    document.getElementById('current-generation-info').textContent = simulation.generation;
    document.getElementById('population-size-info').textContent = simulation.getAliveHares().length;
    document.getElementById('snow-coverage-info').textContent = Math.round(simulation.snowCoverage * 100);
}

function replaceSimulation() {
    // clear interval if it exists, update pause button text
    if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
    }
    // reset text regardless
    document.getElementById('play-button').textContent = 'Play';
    // regenerate the climate and generation functions
    for (const [key, value] of Object.entries(climateFunctions)) {
        climateFunctions[key] = new value.constructor(currentConfig.startWeek, 0);
    }
    for (const [key, value] of Object.entries(generationFunctions)) {
        generationFunctions[key] = new value.constructor(currentConfig.startWeek);
    }
    simulation = new Simulation({ ...currentConfig, climateGenerator: climateFunctions[currentConfig.climateGenerator], generationGenerator: generationFunctions[currentConfig.generationGenerator] });
    window.simulation = simulation; // temp
    // initialize grid
    genotypeGrid = new hareGrid(simulation, 'genotype-grid');
    graphSetup();
    updateWeatherBar();
    updateStatusPanel();
}

function updateScenario() {
    // recreate the dependencies since they may have random elements or be startweek dependent
    for (const [key, value] of Object.entries(climateFunctions)) {
        climateFunctions[key] = new value.constructor(currentConfig.startWeek, 0);
    }
    for (const [key, value] of Object.entries(generationFunctions)) {
        generationFunctions[key] = new value.constructor(currentConfig.startWeek);
    }
    currentConfig = { ...scenarios[selectedScenarioIndex].options };
    // set all form values to the current scenario
    const form = document.getElementById('config-form');
    form.elements['carrying-capacity'].value = currentConfig.carryingCapacity;
    form.elements['base-survival-rate'].value = currentConfig.baseSurvivalRate;
    form.elements['mismatch-penalty'].value = currentConfig.mismatchPenalty;
    form.elements['selection'].checked = currentConfig.selection;
    toggleInputGroup(document.getElementById('input-group-mismatch-penalty'), currentConfig.selection);
    form.elements['start-week'].value = currentConfig.startWeek;

    // set initial values for the output fields, will be properly updated on input change
    form.elements['base-survival-rate-output'].value = currentConfig.baseSurvivalRate;
    form.elements['mismatch-penalty-output'].value = currentConfig.mismatchPenalty;

    // similarly, determine if the mismatch penalty input should be disabled
    form.elements['mismatch-penalty'].disabled = !currentConfig.selection;

    // set the climate and generation functions, matching by name
    const climateSelect = form.elements['climate-function'];
    const generationSelect = form.elements['generation-function'];
    // find the index based on the original scenario's name
    climateSelect.selectedIndex = Array.from(climateSelect.options).findIndex((option) => option.value === scenarios[selectedScenarioIndex].options.climateGenerator);
    generationSelect.selectedIndex = Array.from(generationSelect.options).findIndex((option) => option.value === scenarios[selectedScenarioIndex].options.generationGenerator);
    replaceSimulation();
}

function toggleInputGroup(element, enabled) {
    if (enabled) {
        element.classList.remove('input-group--disabled');
    } else {
        element.classList.add('input-group--disabled');
    }
    for (const input of element.querySelectorAll('input')) {
        if (input.type !== 'checkbox') {
            input.disabled = !enabled;
        }
    }
}

function main() {
    weatherBar = document.getElementById('weather-bar');
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

    // --- event listeners ---

    // sim control buttons
    const advanceSimulation = (e, animate = true) => {
        if (advanceRateType === 'generations') {
            let generations = 0;
            while (generations < advanceRateValue) {
                // check if the next advance will generate a new generation
                if (simulation.generationGenerator.shouldGenerate(simulation.week)) {
                    newGenerationWeeks.push(simulation.week);
                    generations++;
                }
                simulation.advanceWeek();
                updateFreqGraphData();
                updateSnowGraphData();
                genotypeGrid.doTick();
            }
        } else {
            let numWeeks = advanceRateValue;
            if (advanceRateType === 'years') {
                numWeeks *= 52;
            }
            for (let i = 0; i < numWeeks; i++) {
                if (simulation.generationGenerator.shouldGenerate(simulation.week)) {
                    newGenerationWeeks.push(simulation.week);
                }
                simulation.advanceWeek();
                updateFreqGraphData();
                updateSnowGraphData();
                genotypeGrid.doTick();
            }
        }
        // update status panel
        updateStatusPanel();

        // animate will be overwritten if animation is disabled on the graph itself
        if (currentTab === 'frequency-graph') {
            if (animate) {
                alleleLineChart.update();
            } else {
                alleleLineChart.update('none');
            }
        } else if (currentTab === 'snow-graph') {
            if (animate) {
                snowLineChart.update();
            } else {
                snowLineChart.update('none');
            }
        } else if (currentTab === 'hare-grid') {
            genotypeGrid.updateGrid();
            updateWeatherBar();
        }
    };

    let runCount = 0;
    const runSimulation = (e) => {
        if (doEndCondition && runCount >= endConditionValue) {
            // end condition reached
            clearInterval(currentInterval);
            currentInterval = null;
            e.target.textContent = 'Play';
            runCount = 0;
        } else if (simulation.hares.length === 0) {
            // no more hare generations remain
            clearInterval(currentInterval);
            currentInterval = null;
            e.target.textContent = 'Play';
            populationWiped = true;
        } else {
            advanceSimulation(e, false);
            runCount++;
        }
    };

    const toggleSimulation = (e) => {
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
            e.target.textContent = 'Play';
        } else {
            currentInterval = setInterval(() => runSimulation(e), playRate);
            e.target.textContent = 'Stop';
        }
    };

    const resetSimulation = (e) => {
        runCount = 0;
        replaceSimulation();
    };

    document.getElementById('advance-button').addEventListener('click', advanceSimulation);
    document.getElementById('play-button').addEventListener('click', toggleSimulation);
    document.getElementById('reset-button').addEventListener('click', resetSimulation);

    // graph buttons

    const remakeAlleleGraph = () => {
        alleleLineChart.destroy();
        const graphConfig = makeAlleleGraphConfig(weekLabels,
                                                  alleleGraphDatasets,
                                                  isAlleleGraphPerGeneration,
                                                  newGenerationWeeks,
                                                  isAlleleGraphArea);
        alleleLineChart = new Chart(document.getElementById('allele-line-chart'), graphConfig);
    };

    const toggleGraphStack = () => {
        isAlleleGraphArea = !isAlleleGraphArea;
        remakeAlleleGraph();
    }

    const toggleTickType = () => {
        isAlleleGraphPerGeneration = !isAlleleGraphPerGeneration;
        remakeAlleleGraph();
    }

    // toggle between snow per week and first snowless week
    const toggleSnowData = () => {
        isSnowLineChartYearly = !isSnowLineChartYearly;
        snowLineChart.destroy();
        const graphConfig = makeSnowGraphConfig(isSnowLineChartYearly ? yearLabels : weekLabels,
                                                isSnowLineChartYearly ? rawFirstSnowlessWeekData : rawSnowData,
                                                isSnowLineChartYearly);
        snowLineChart = new Chart(document.getElementById('snow-chart'), graphConfig);
    }

    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
    document.getElementById('toggle-ticks').addEventListener('click', toggleTickType);
    document.getElementById('toggle-snow-data').addEventListener('click', toggleSnowData);
    
    // --- form events ---

    // toggle input group disabled state


    // tie form submission to simulation update
    const configForm = document.getElementById('config-form');

    // if any field changes, display a message informing the user to apply the changes
    configForm.addEventListener('input', () => {
        document.getElementById('config-form-apply-msg').classList.remove('hidden');
    });


    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // remove the apply message
        document.getElementById('config-form-apply-msg').classList.add('hidden');
        const formData = new FormData(e.target);
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
            climateGenerator: climateFunctionKey,
            generationGenerator: generationFunctionKey,
        };
        currentConfig = newConfig;
        replaceSimulation()

        // deselect all presets
        for (const preset of presetsContainer.children) {
            preset.classList.remove('preset-entry--selected');
        }
    });

    // if selection is not selected, disable the mismatch penalty input
    configForm.elements['selection'].addEventListener('change', (e) => {
        configForm.elements['mismatch-penalty'].disabled = !e.target.checked;
        toggleInputGroup(document.getElementById('input-group-mismatch-penalty'), configForm.elements['selection'].checked);
    });

    const climateSelect = configForm.elements['climate-function'];
    const generationSelect = configForm.elements['generation-function'];

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

    // --- form input events ---

    const controlForm = document.getElementById('control-form');
    const inputGroupEndCondition = document.getElementById('input-group-end-condition');
    // set the initial values for the form inputs
    controlForm.querySelector('#advance-rate-value').value = advanceRateValue;
    controlForm.querySelector('#advance-rate-type').value = advanceRateType;
    controlForm.querySelector('#do-end-condition').checked = doEndCondition;
    toggleInputGroup(inputGroupEndCondition, doEndCondition);
    controlForm.querySelector('#end-condition-value').value = endConditionValue;
    controlForm.querySelector('#play-rate').value = playRate;
    controlForm.querySelector('#play-rate-output').value = playRate;

    controlForm.querySelector('#advance-rate-value').addEventListener('input', (e) => {
        advanceRateValue = parseInt(e.target.value);
    });

    controlForm.querySelector('#advance-rate-type').addEventListener('change', (e) => {
        advanceRateType = e.target.value;
    });

    controlForm.querySelector('#do-end-condition').addEventListener('change', (e) => {
        doEndCondition = e.target.checked;
        toggleInputGroup(inputGroupEndCondition, doEndCondition);
    });

    controlForm.querySelector('#end-condition-value').addEventListener('input', (e) => {
        endConditionValue = parseInt(e.target.value);
    });

    controlForm.querySelector('#play-rate').addEventListener('input', (e) => {
        playRate = parseInt(e.target.value);
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = setInterval(() => runSimulation(e), playRate);
        }
    });

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

            // update only the active tab content
            currentTab = tab.dataset.tab;
            if (currentTab === 'frequency-graph') {
                alleleLineChart.update();
            } else if (currentTab === 'snow-graph') {
                snowLineChart.update();
            } else if (currentTab === 'hare-grid') {
                genotypeGrid.updateGrid();
                updateWeatherBar();
            }
        });
    }
}

main();
