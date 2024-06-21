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
                label: `Allele ${alleleId}`,
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
        const alleleId = dataset.label.match(/(\d+)/)[1];
        dataset.data.push(currentFrequency[alleleId]);
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

function updateScenario() {
    currentConfig = scenarios[selectedScenarioIndex].options;
    simulation = new Simulation(currentConfig);
    window.simulation = simulation; // temp
    graphSetup();
}

function main() {
    updateScenario();

    // add all presets to the div
    const presetsContainer = document.getElementById('preset-container');
    for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        const button = document.createElement('button');
        button.textContent = scenario.name;
        button.addEventListener('click', () => {
            selectedScenarioIndex = i;
            updateScenario();
        });
        presetsContainer.appendChild(button);
    }

    const updateSimulation = () => {
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

    // assign to button
    document.getElementById('advance-week').addEventListener('click', updateSimulation);
    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
    document.getElementById('advance-10-years').addEventListener('click', () => {
        for (let i = 0; i < 520; i++) {
            simulation.advanceWeek();
            updateGraphData();
        }
        alleleLineChart.update();
    });
}

main();
