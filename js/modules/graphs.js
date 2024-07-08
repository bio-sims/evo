/**
 * @file Contains graph configurations
 * @author Zachary Mullen
 * @module graphs
 */

const displayWeek = (week, weekLabels) => {
    console.log(week);
    if (weekLabels[weekLabels.length - 1] < 52) {
        return week;
    }
    const year = Math.floor(week / 52);
    const weekOfYear = week % 52;
    return `Yr${year} Wk${weekOfYear}`;
};

const makeAlleleGraphConfig = (weekLabels, alleleGraphDatasets, useGenerations, generationWeeks, useChartArea) => {
    for (const dataset of alleleGraphDatasets) {
        dataset.fill = useChartArea ? '-1' : false;
    }
    alleleGraphDatasets[0].fill = useChartArea ? 'origin' : false;
    return {
        type: "line",
        data: {
            labels: weekLabels,
            datasets: alleleGraphDatasets,
        },
        options: {
            animation: weekLabels.length < 512,
            interaction: {
                mode: "index",
                intersect: false,
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Simulation Week",
                    },
                    ticks: {
                        callback: (val, index) => {
                            if (useGenerations) {
                                return generationWeeks.includes(weekLabels[index]) ? `Gen ${generationWeeks.indexOf(weekLabels[index]) + 2}` : null;
                            }
                            return displayWeek(weekLabels[index], weekLabels);
                        },
                        maxTicksLimit: 10,
                    }
                },
                y: {
                    stacked: useChartArea,
                    title: {
                        display: true,
                        text: "Frequency",
                    },
                    min: 0,
                    max: 1,
                },
            },
            plugins: {
                legend: {
                    display: true,
                    text: "Relative Allele Frequency",
                },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            let generation = 0;
                            // find the generation week that the current week is in
                            if (generationWeeks.length !== 0) {
                                // use binary search to find the largest week not greater than the current week
                                let left = 0;
                                let right = generationWeeks.length - 1;
                                while (left <= right) {
                                    const mid = Math.floor((left + right) / 2);
                                    if (generationWeeks[mid] <= context[0].label) {
                                        generation = mid + 1;
                                        left = mid + 1;
                                    } else {
                                        right = mid - 1;
                                    }
                                }
                            }
                            return [`Year ${Math.floor(context[0].label / 52)} Week ${context[0].label % 52}`,
                                    `Generation ${generation + 1}`];
                        }
                    },
                },
            },
        },
    };
};

const makeSnowGraphConfig = (labels, rawSnowData, isYearly) => {
    return {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: isYearly ? "First Snowless Week" : "Snow Coverage",
                    data: rawSnowData,
                    borderColor: "rgba(255, 99, 132, 1)",
                    backgroundColor: "rgba(255, 99, 132, 0.5)",
                    fill: true,
                },
            ],
        },
        options: {
            animation: labels.length < 512,
            currentGraph: isYearly ? "yearly" : "weekly",
            interaction: {
                mode: "index",
                intersect: false,
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: isYearly ? "Simulation Year" : "Simulation Week",
                    },
                    ticks: {
                        callback: (val, index) => {
                            if (isYearly) {
                                return labels[index];
                            }
                            return displayWeek(labels[index], labels);
                        },
                        maxTicksLimit: 10,
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: isYearly ? "First Snowless Week" : "Snow Coverage",
                    },
                    min: 0,
                    max: isYearly ? 52 : 1,
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            if (isYearly) {
                                return `Year ${context[0].label}`;
                            }
                            return `Year ${Math.floor(context[0].label / 52)} Week ${context[0].label % 52}`;
                        }
                    },
                },
            },
        },
    };
};

export {
    makeAlleleGraphConfig,
    makeSnowGraphConfig
};
