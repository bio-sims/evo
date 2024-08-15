/**
 * @file Main entry point for the simulation application
 * @author Zachary Mullen
 * @module main
 * @typedef { import("../../types/climate").ClimateGenerator }
 */

import { Chart, LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm';
Chart.register(LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip);
// js does not have a built-in way to seed Math.random, so we use a library
import seedrandom from 'https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/+esm';
import { Simulation } from './modules/simulation.js';
import configFile from '../sim.config.js';
import { makeAlleleGraphConfig, makeSnowGraphConfig } from './modules/graphs.js';
import { IntegralStableClimate, IntegralWarmingClimate, RealisticStableClimate, RealisticWarmingClimate } from './modules/climate.js';
import { GenerateEvery18Weeks } from './modules/generation.js';
import hareGrid from './modules/grid.js';
import { getThemeIconData, setupTheme, toggleTheme } from './modules/theme.js';
import DropdownButton from './modules/dropdownButton.js';

// --- module scoped variables ---

/**
 * The available allele sets from the configuration file
 * @type {Object<string, Object[]>}
 */
let alleleSets = configFile.alleleSets;
/**
 * The available scenarios from the configuration file
 * @type {Object[]}
 */
let scenarios = configFile.scenarios;
/**
 * The index of the currently selected preset scenario
 * @type {number}
 */
let selectedScenarioIndex = 0;
let climateFunctions = {
    IntegralStableClimate: new IntegralStableClimate(0, 0),
    IntegralWarmingClimate: new IntegralWarmingClimate(0, 0),
    RealisticStableClimate: new RealisticStableClimate(0, 0),
    RealisticWarmingClimate: new RealisticWarmingClimate(0, 0),
}
let generationFunctions = {
    GenerationEvery18Weeks: new GenerateEvery18Weeks(0),
}
// copy with spread operator to avoid modifying the original
let currentConfig = { ...scenarios[selectedScenarioIndex].options };
// replace any string names in scenario's available alleles with the actual objects
for (const scenario of scenarios) {
    if (typeof scenario.options.availableAlleles === 'string') {
        scenario.options.alleleSetName = scenario.options.availableAlleles;
        scenario.options.availableAlleles = alleleSets[scenario.options.availableAlleles];
    }
}


// --- theme setup ---
setupTheme();
document.getElementById('theme-icon-path').setAttribute('d', getThemeIconData());

// --- chart.js global configuration ---
function updateChartColors() {
    const styles = getComputedStyle(document.documentElement);
    Chart.defaults.color = styles.getPropertyValue('--cr-text-primary')
    Chart.defaults.plugins.legend.labels.color = styles.getPropertyValue('--cr-text-primary');
    Chart.defaults.borderColor = styles.getPropertyValue('--cr-bg-contrast');
}
Chart.defaults.elements.point.hitRadius = 8;

// --- globals related to simulation control ---

/**
 * The number of weeks to advance the simulation by
 * @type {number}
 */
let advanceRateValue = 1;
/**
 * The type of advance rate
 * @type {'weeks'|'generations'|'years'}
 */
let advanceRateType = 'weeks';
/**
 * Holds current interval ID for the simulation
 * @type {number|null}
 */
let currentInterval = null;
/**
 * Whether the population has been wiped out
 * @type {boolean}
 * @todo unused
 */
let populationWiped = false;
/**
 * Whether to use an end condition for the interval
 * @type {boolean}
 */
let doEndCondition = true;
/**
 * The number of advances to make before stopping the interval
 * @type {number}
 */
let endConditionValue = 50;
/**
 * The rate at which the simulation advances in milliseconds
 * @type {number}
 */
let playRate = 250;

// --- graph related data initialization ---

/**
 * The current simulation week labels for the allele frequency graph
 * @type {number[]}
 */
let weekLabels = Array.from({ length: 52 }, (_, i) => i);
/**
 * The current simulation year labels for the snow coverage graph
 * @type {number[]}
 */
let yearLabels = Array.from({ length: 10 }, (_, i) => i);
/**
 * The weeks where a new generation was generated
 * @type {number[]}
 */
let newGenerationWeeks = [];
/**
 * Whether to display the snow graph yearly or weekly
 * @type {boolean}
 */
let isSnowLineChartYearly = true;
/**
 * If the graph gridmarks should be per generation or per week
 * @type {boolean}
 */
let isAlleleGraphPerGeneration = false;
/**
 * If the graph should be stacked or not
 * @type {boolean}
 */
let isAlleleGraphArea = true;
/**
 * The raw allele frequency data for the allele graph
 * @type {Object[]}
 */
let alleleGraphDatasets = [];
/**
 * The raw snow coverage data for the snow graph per week
 * @type {number[]}
 */
let rawSnowData = [];
/**
 * The first week of snowless coverage for each year
 * @type {number[]}
 */
let rawFirstSnowlessWeekData = [];

/**
 * The chart object for displaying the allele frequencies
 * @type {Chart|null}
 */
let alleleLineChart = null;
/**
 * The chart object for displaying the snow coverage
 * @type {Chart|null}
 */
let snowLineChart = null;
/**
 * The main simulation grid display
 * @type {hareGrid|null}
 */
let genotypeGrid = null;
/**
 * @type {Simulation|null}
*/
let simulation = null;
/**
 * id of the currently active tab
 * @type {string}
 */
let currentMainTab = 'frequency-graph';
/**
 * The weather bar element
 * @type {HTMLElement|null}
 */
let weatherBar = null;

/**
 * Returns the default hue value for a given index in the available alleles array
 * @param {number} index - The allele index
 * @returns {number} The hue value
 */
function getColorHue(index) {
    return (index / simulation.availableAlleles.length) * 360;
}

/**
 * Creates new graphs that are initialized/zeroed at the current simulation week
 */
function graphSetup() {
    updateChartColors();
    if (!simulation) return;
    // set 52 weeks from the current week as the initial
    weekLabels = Array.from({ length: 52 }, (_, i) => i + simulation.week);
    yearLabels = Array.from({ length: 10 }, (_, i) => i + Math.floor(simulation.week / 52));
    newGenerationWeeks = [simulation.week];

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

/**
 * Updates the global labels for the graphs
 */
function updateLabels() {
    if (!simulation) return;
    const currentWeek = simulation.week;
    const currentYear = Math.floor(currentWeek / 52);
    if (weekLabels.length <= currentWeek - currentConfig.startWeek) {
        weekLabels.push(currentWeek);
    }
    // if the starting week was past when the snowless week was recorded
    while (currentWeek % 52 === 0 && rawFirstSnowlessWeekData.length < currentYear) {
        rawFirstSnowlessWeekData.push(null);
    }
    if (yearLabels.length < currentYear - Math.floor(currentConfig.startWeek / 52)) {
        yearLabels.push(currentYear);
    }
}

/**
 * Optimizes the chart for performance if it exceeds a certain threshold
 * @param {Chart} chart - The chart to optimize
 */
function optimizeChart(chart) {
    if (chart.data.labels.length > 512) {
        chart.options.spanGaps = true;
        chart.options.datasets.line.pointRadius = 0;
        chart.options.elements.point.radius = 0;
        chart.options.animation = false;
    }
}

/**
 * Updates the allele frequency graph data with the current allele frequencies
 * @param {boolean} refresh - Whether to refresh/display the graph changes immediately
 */
function updateFreqGraphData(refresh = false) {
    // only refresh if the tab is active
    refresh = refresh && currentMainTab === 'frequency-graph';
    // add the current allele frequencies to the chart
    if (!simulation) return;
    updateLabels();
    const currentFrequency = simulation.getCoatAlleleFrequency();
    for (const dataset of alleleGraphDatasets) {
        dataset.data.push(currentFrequency[dataset.id]);
    }
    optimizeChart(alleleLineChart);
    if (refresh) {
        alleleLineChart.update();
    }
}

/**
 * Updates the snow coverage graph data with the current snow coverage
 * @param {boolean} refresh - Whether to refresh/display the graph changes immediately
 */
function updateSnowGraphData(refresh = false) {
    // only refresh if the tab is active
    refresh = refresh && currentMainTab === 'snow-graph';
    if (!simulation) return;
    updateLabels();
    rawSnowData.push(simulation.snowCoverage);
    // this assumes that snow coverage being 0 is the first snowless week
    const year = Math.floor(simulation.week / 52);
    const week = simulation.week % 52;
    if (simulation.snowCoverage === 0 && rawFirstSnowlessWeekData.length < year + 1) {
        rawFirstSnowlessWeekData.push(week);
    }
    optimizeChart(snowLineChart);
    if (refresh) {
        snowLineChart.update();
    }
}

/**
 * Updates the weather bar with the current snow coverage
 */
function updateWeatherBar() {
    if (!simulation) return;
    weatherBar.style.backgroundColor = `hsla(37, 100%, ${30 + (70 * simulation.snowCoverage)}%, 1)`;
    weatherBar.style.color = simulation.snowCoverage > 0.5 ? 'black' : 'white';
    weatherBar.textContent = `${Math.round(simulation.snowCoverage * 100)}%`;
}

/**
 * Updates the width of a given element to reflect the current progress
 * @param {HTMLElement} progressBar - The element whose width to update
 * @param {number} current - The current progress value
 * @param {number} total - The goal progress value
 */
function updateProgressBar(progressBar, current, total) {
    if (!simulation) {
        progressBar.style.width = '0%';
        return;
    }
    progressBar.style.width = `${Math.min((current / total) * 100, 100)}%`;
}

/**
 * Updates the status panel with the current simulation information
 */
function updateStatusPanel() {
    if (!simulation) return;
    document.getElementById('current-year-info').textContent = Math.floor(simulation.week / 52);
    document.getElementById('current-week-info').textContent = simulation.week % 52;
    document.getElementById('current-generation-info').textContent = simulation.generation;
    document.getElementById('population-size-info').textContent = simulation.getAliveHares().length;
    document.getElementById('snow-coverage-info').textContent = Math.round(simulation.snowCoverage * 100);
}

/**
 * Updates the play button based on the given state.
 *
 * @param {string} state - The state of the play button (e.g. stopped state)
 * @return {void} This function does not return a value.
 */
function updatePlayButton(state) {
    const playButton = document.getElementById('play-button');
    if (state === 'play') {
        playButton.querySelector('path').setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m3 14H9c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1');
        playButton.lastChild.textContent = 'Stop';
    } else {
        playButton.querySelector('path').setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 13.5v-7c0-.41.47-.65.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5c-.33.25-.8.01-.8-.4');
        playButton.lastChild.textContent = 'Play';
    }
}

/**
 * Replaces/resets the current simulation with a new one based on the current configuration
 */
function replaceSimulation() {
    // clear interval if it exists, update pause button text
    if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
    }
    // reset text regardless
    updatePlayButton('stop');
    // set the seed if it exists
    if (currentConfig.seed) {
        seedrandom(currentConfig.seed, { global: true });
    } else {
        seedrandom({ global: true });
    }
    // regenerate the climate and generation functions
    for (const [key, value] of Object.entries(climateFunctions)) {
        climateFunctions[key] = new value.constructor(currentConfig.startWeek, 0);
    }
    for (const [key, value] of Object.entries(generationFunctions)) {
        generationFunctions[key] = new value.constructor(currentConfig.startWeek);
    }
    // seed the random number generator if a seed is provided
    simulation = new Simulation({ ...currentConfig, climateGenerator: climateFunctions[currentConfig.climateGenerator], generationGenerator: generationFunctions[currentConfig.generationGenerator] });
    window.simulation = simulation; // temp
    // initialize grid
    genotypeGrid = new hareGrid(simulation, 'genotype-grid');
    graphSetup();
    updateWeatherBar();
    updateStatusPanel();
}

/**
 * Resets and reinitializes the simulation with the currently selected scenario
 */
function updateScenario() {
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

    // rng seed form values
    if (currentConfig.seed) {
        form.elements['do-unset-seed'].checked = false;
        form.elements['rng-seed'].value = currentConfig.seed;
    } else {
        form.elements['do-unset-seed'].checked = true;
        form.elements['rng-seed'].value = '';
    }
    toggleInputGroup(document.getElementById('input-group-rng-seed'), !form.elements['do-unset-seed'].checked);

    // set the available alleles dropdown to the current scenario's available alleles
    const alleleSelect = form.elements['allele-set'];
    alleleSelect.value = scenarios[selectedScenarioIndex].options.alleleSetName;
    // set the climate and generation functions, matching by name
    const climateSelect = form.elements['climate-function'];
    const generationSelect = form.elements['generation-function'];
    // find the index based on the original scenario's name
    climateSelect.value = scenarios[selectedScenarioIndex].options.climateGenerator;
    generationSelect.value = scenarios[selectedScenarioIndex].options.generationGenerator;
    replaceSimulation();
}

/**
 * Toggles the disabled state of an input group
 * @param {HTMLElement} element - The input group element to toggle
 * @param {boolean} enabled - Whether the input group should be enabled
 */
function toggleInputGroup(element, enabled) {
    element.classList.toggle('input-group--disabled', !enabled);
    for (const input of element.querySelectorAll('input')) {
        if (input.type !== 'checkbox') {
            input.disabled = !enabled;
        }
    }
}

/**
 * Advances the simulation by the current advance rate
 * @param {bool} animate - Whether to animate the graph update, may be overridden by the graph itself
 */
function advanceSimulation(animate = true, type = advanceRateType, value = advanceRateValue) {
    if (type === 'generations') {
        let generations = 0;
        while (generations < value) {
            simulation.advanceWeek();
            if (simulation.generationGenerator.shouldGenerate(simulation.week)) {
                newGenerationWeeks.push(simulation.week);
                generations++;
            }
            updateFreqGraphData();
            updateSnowGraphData();
            genotypeGrid.doTick();
        }
    } else {
        let numWeeks = value;
        if (type === 'years') {
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
    if (currentMainTab === 'frequency-graph') {
        if (animate) {
            alleleLineChart.update();
        } else {
            alleleLineChart.update('none');
        }
    } else if (currentMainTab === 'snow-graph') {
        if (animate) {
            snowLineChart.update();
        } else {
            snowLineChart.update('none');
        }
    } else if (currentMainTab === 'hare-grid') {
        genotypeGrid.updateGrid();
        updateWeatherBar();
    }
};

/**
 * Logic entry point for the simulation application, mostly setting up the DOM and event listeners
 */
function main() {
    weatherBar = document.getElementById('weather-bar');
    const controlForm = document.getElementById('control-form');
    const configForm = document.getElementById('config-form');

    // -- generate dropdown options --

    const alleleSelect = configForm.elements['allele-set'];
    const climateSelect = configForm.elements['climate-function'];
    const generationSelect = configForm.elements['generation-function'];

    for (const [key, value] of Object.entries(alleleSets)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        alleleSelect.appendChild(option);
    }

    for (const [key, value] of Object.entries(climateFunctions)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.friendlyName;
        climateSelect.appendChild(option);
    }

    for (const [key, value] of Object.entries(generationFunctions)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.friendlyName;
        generationSelect.appendChild(option);
    }

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
            // hide apply message in case it was shown before
            document.getElementById('config-form-apply-msg').classList.add('hidden');
            updateScenario();
        });
        if (i === selectedScenarioIndex) {
            presetClone.classList.add('preset-entry--selected');
        }
        presetsContainer.appendChild(presetClone);
    }

    const controlPlayProgressBar = document.querySelector('#play-progress-bar > div');

    // --- button event listeners ---

    // simulation control button events

    /**
     * The number of times the simulation has run in the current interval
     * @type {number}
    */
   let runCount = 0;

    const onPlayEnd = () => {
        clearInterval(currentInterval);
        currentInterval = null;
        updatePlayButton('stop');
        // re-enable the skip button
        document.getElementById('skip-button').disabled = false;
    }

    const validControlForm = () => {
        if (!document.getElementById('control-form').checkValidity()) {
            document.getElementById('control-form').reportValidity();
            return false;
        }
        return true;
    }

    const runSimulation = (e) => {
        if (doEndCondition && runCount >= endConditionValue) {
            onPlayEnd();
        } else if (simulation.hares.length === 0) {
            populationWiped = true;
            onPlayEnd();
        } else {
            advanceSimulation(false);
            runCount++;
        }
        if (doEndCondition) {
            updateProgressBar(controlPlayProgressBar, runCount, endConditionValue);
        }
    };

    const togglePlaySimulation = (e) => {
        runCount = 0;
        updateProgressBar(controlPlayProgressBar, runCount, endConditionValue);
        if (currentInterval) {
            onPlayEnd();
        } else {
            if (!validControlForm()) return;
            currentInterval = setInterval(() => runSimulation(e), playRate);
            updatePlayButton('play');
            // disable the skip button while the simulation is running
            document.getElementById('skip-button').disabled = true;
        }
    };

    const resetSimulation = () => {
        runCount = 0;
        populationWiped = false;
        updateProgressBar(controlPlayProgressBar, runCount, endConditionValue);
        replaceSimulation();
        document.getElementById('skip-button').disabled = false;
    };

    document.getElementById('play-button').addEventListener('click', togglePlaySimulation);
    document.getElementById('reset-button').addEventListener('click', resetSimulation);

    // graph button events

    const remakeAlleleGraph = () => {
        alleleLineChart.destroy();
        const graphConfig = makeAlleleGraphConfig(weekLabels,
                                                  alleleGraphDatasets,
                                                  isAlleleGraphPerGeneration,
                                                  newGenerationWeeks,
                                                  isAlleleGraphArea);
        alleleLineChart = new Chart(document.getElementById('allele-line-chart'), graphConfig);
    };

    const remakeSnowGraph = () => {
        snowLineChart.destroy();
        const graphConfig = makeSnowGraphConfig(isSnowLineChartYearly ? yearLabels : weekLabels,
                                                isSnowLineChartYearly ? rawFirstSnowlessWeekData : rawSnowData,
                                                isSnowLineChartYearly);
        snowLineChart = new Chart(document.getElementById('snow-chart'), graphConfig);
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
        remakeSnowGraph();
    }

    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
    document.getElementById('toggle-ticks').addEventListener('click', toggleTickType);
    document.getElementById('toggle-snow-data').addEventListener('click', toggleSnowData);

    // --- config form events ---

    // if any field changes, display a message informing the user to apply the changes
    configForm.addEventListener('input', () => {
        document.getElementById('config-form-apply-msg').classList.remove('hidden');
    });

    // apply the changes to the simulation when the form is submitted
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // remove the apply message
        document.getElementById('config-form-apply-msg').classList.add('hidden');
        // put form data into a new config object
        const formData = new FormData(e.target);
        const newConfig = {
            carryingCapacity: parseInt(formData.get('carrying-capacity')),
            baseSurvivalRate: parseFloat(formData.get('base-survival-rate')),
            mismatchPenalty: parseFloat(formData.get('mismatch-penalty')),
            selection: formData.get('selection') === 'on',
            startWeek: parseInt(formData.get('start-week')),
            availableAlleles: alleleSets[formData.get('allele-set')],
            climateGenerator: formData.get('climate-function'),
            generationGenerator: formData.get('generation-function'),
        };
        if (formData.get('do-unset-seed') !== 'on') {
            newConfig.seed = formData.get('rng-seed');
        }
        toggleInputGroup(document.getElementById('input-group-rng-seed'), !formData.get('do-unset-seed'));
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

    configForm.elements['do-unset-seed'].addEventListener('change', (e) => {
        configForm.elements['rng-seed'].disabled = !e.target.checked;
        toggleInputGroup(document.getElementById('input-group-rng-seed'), !e.target.checked);
    });

    // --- control form input events ---

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
        // ensure the progress bar is reset while the simulation is running
        updateProgressBar(controlPlayProgressBar, 0, endConditionValue);
        runCount = 0;
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

    const timeSkipForm = document.getElementById('time-skip-form');
    timeSkipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const skipValue = parseInt(formData.get('time-skip-value'));
        if (isNaN(skipValue)) return;
        const skipType = formData.get('time-skip-type');
        advanceSimulation(true, skipType, skipValue);
    });

    // --- tab events ---

    const tabs = document.querySelectorAll('.tab[data-tab]');
    // group tabs by their data-group attribute
    const tabGroups = Array.from(tabs).reduce((acc, tab) => {
        const group = tab.dataset.group;
        if (!acc[group]) acc[group] = [];
        acc[group].push(tab);
        return acc;
    }, {});

    for (const tabGroup of Object.values(tabGroups)) {
        for (const tab of tabGroup) {
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

    // main specific tab events
    for (const tab of tabGroups.main) {
        tab.addEventListener('click', () => {
            currentMainTab = tab.dataset.tab;
            if (currentMainTab === 'frequency-graph') {
                alleleLineChart.update();
            } else if (currentMainTab === 'snow-graph') {
                snowLineChart.update();
            } else if (currentMainTab === 'hare-grid') {
                genotypeGrid.updateGrid();
                updateWeatherBar();
            }
        });
    }

    // --- theme events ---
    document.getElementById('theme-toggle').addEventListener('click', () => {
        toggleTheme();
        updateChartColors();
        remakeAlleleGraph();
        remakeSnowGraph();
        // replace with svg of current theme
        const themeSvgPath = document.getElementById('theme-icon-path');
        themeSvgPath.setAttribute('d', getThemeIconData());
    });

    // --- dropdown events ---
    const exportAlleleChart = document.getElementById('export-allele-chart');
    const exportSnowChart = document.getElementById('export-snow-chart');
    const chartToJSON = (chart) => {
        const data = {
            labels: chart.data.labels,
            datasets: chart.data.datasets.map((dataset) => {
                return {
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: dataset.borderColor,
                    backgroundColor: dataset.backgroundColor,
                    fill: dataset.fill,
                };
            }),
        };
        return JSON.stringify(data);
    }

    const downloadData = (href, filename) => {
        const hiddenAnchor = document.createElement('a');
        hiddenAnchor.href = href;
        hiddenAnchor.download = filename;
        hiddenAnchor.click();
    }

    const createChartImage = (exportCanvas, imageType, quality) => {
        const image = new Image();
        image.src = `data:${imageType};base64,${exportCanvas.toDataURL(imageType, quality).split(',')[1]}`;
        return image;
    }

    const openChartInNewTab = (image, filename) => {
        const newTab = window.open();
        newTab.document.write(image.outerHTML);
        newTab.document.title = filename;
    }

    const createChartExportCanvas = (getChart) => {
        const chart = getChart();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = chart.width;
        exportCanvas.height = chart.height;
        const ctx = exportCanvas.getContext('2d');
        ctx.drawImage(chart.canvas, 0, 0);
        return exportCanvas;
    }

    const createChartExportCanvasWithWhiteBackground = (getChart) => {
        const chart = getChart();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = chart.width;
        exportCanvas.height = chart.height;
        const ctx = exportCanvas.getContext('2d');
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--cr-bg-primary');
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(chart.canvas, 0, 0);
        return exportCanvas;
    }

    const chartExportOptions = (getChart, chartName) => [
        {
            text: "Download PNG",
            callback: () => {
                const exportCanvas = createChartExportCanvas(getChart);
                const image = exportCanvas.toDataURL('image/png');
                downloadData(image, `${chartName}-${Date.now()}.png`);
                exportCanvas.remove();
            },
        },
        {
            text: "Download JPEG",
            callback: () => {
                const exportCanvas = createChartExportCanvasWithWhiteBackground(getChart);
                const image = exportCanvas.toDataURL('image/jpeg', 1);
                downloadData(image, `${chartName}-${Date.now()}.jpeg`);
                exportCanvas.remove();
            },
        },
        {
            text: "Download JSON",
            callback: () => {
                const json = chartToJSON(getChart());
                const blob = new Blob([json], { type: 'application/json' });
                downloadData(URL.createObjectURL(blob), `${chartName}-${Date.now()}.json`);
            },
        },
        {
            text: "PNG in New Tab",
            link: true,
            callback: () => {
                const exportCanvas = createChartExportCanvas(getChart);
                const image = createChartImage(exportCanvas, 'image/png');
                openChartInNewTab(image, `${chartName}-${Date.now()}.png`);
            },
        },
        {
            text: "JPEG in New Tab",
            link: true,
            callback: () => {
                const exportCanvas = createChartExportCanvasWithWhiteBackground(getChart);
                const image = createChartImage(exportCanvas, 'image/jpeg', 1);
                openChartInNewTab(image, `${chartName}-${Date.now()}.jpeg`);
            },
        },
        {
            text: "JSON in New Tab",
            link: true,
            callback: () => {
                const json = chartToJSON(getChart());
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            },
        },
    ];

    // pass chart as a getter in chartExportOptions to ensure up-to-date data
    const alleleDropdownButton = new DropdownButton(exportAlleleChart, chartExportOptions(() => alleleLineChart, 'allele-chart'), { closeOnClick: true, above: true, left: false });
    const snowDropdownButton = new DropdownButton(exportSnowChart, chartExportOptions(() => snowLineChart, 'snow-chart'), { closeOnClick: true, above: true, left: false });
}

main();
