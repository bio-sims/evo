/**
 * @file Main entry point for the simulation application
 * @author Zachary Mullen
 * @module main
 */

import { Chart, LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm';
import { Simulation } from "./modules/simulation.js";
Chart.register(LineController, LineElement, Filler, PointElement, LinearScale, Title, CategoryScale, Legend, Tooltip);

// simulation configuration values, scoped to this module

let startWeek = 0;
const availableAlleles = [
    { id: 1, type: "coat", brownWeek: 15, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
    { id: 2, type: "coat", brownWeek: 24, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
    { id: 3, type: "coat", brownWeek: 26, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
    { id: 4, type: "coat", brownWeek: 35, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
];
const carryingCapacity = 20;
const baseSurvivalRate = 0.96;
const mismatchPenalty = 0.07;
const calculateSnowCoverage = (week) => {
    const yearWeek = week % 52;
    if (yearWeek < 18) return 1;
    if (yearWeek < 36) return 0;
    return 1;
};
const shouldGenerate = (week) => week % 18 === 0;

// charts

let alleleLineChart = null;

// simulation object

/**
 * @type {Simulation|null}
 */
let simulation = null;

function getColorHue(index) {
    return (index / availableAlleles.length) * 360;
}

function graphSetup() {
    if (!simulation) return;
    if (alleleLineChart) alleleLineChart.destroy();
    const initialFrequency = simulation.getCoatAlleleFrequency();
    const ctx = document.getElementById('allele-line-chart');
    const data = {
        labels: Array.from({ length: 52 }, (_, i) => i + 1),
        // make a dataset with the initial allele frequencies
        datasets: Object.keys(initialFrequency).map((alleleId, i) => {
            const allele = availableAlleles.find((allele) => allele.id === parseInt(alleleId));
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
    console.log(alleleLineChart.data.datasets);
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
    if (refresh) alleleLineChart.update();
}

function main() {
    simulation = new Simulation({
        startWeek,
        availableAlleles,
        carryingCapacity,
        baseSurvivalRate,
        mismatchPenalty,
        calculateSnowCoverage,
        shouldGenerate
    });
    window.simulation = simulation;
    graphSetup();

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
        console.log(alleleLineChart);
    }

    // assign to button
    document.getElementById('advance-week').addEventListener('click', updateSimulation);
    document.getElementById('toggle-stack').addEventListener('click', toggleGraphStack);
}

main();
