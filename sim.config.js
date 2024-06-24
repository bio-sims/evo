// helper variables and functions for the simulation configuration as needed
const basicAlleles = [
  { id: 1, name: "Allele Br15.Wh36", type: "coat", brownWeek: 15, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
  { id: 2, name: "Allele Br24.Wh36", type: "coat", brownWeek: 24, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
  { id: 3, name: "Allele Br26.Wh36", type: "coat", brownWeek: 26, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
  { id: 4, name: "Allele Br35.Wh36", type: "coat", brownWeek: 35, brownRate: 1, whiteWeek: 36, whiteRate: 1 },
];
const stableClimate = (week) => (week % 52 < 18 || week % 52 >= 36) ? 1 : 0;
const variableClimate = (week) => {
  // temporarily just choose a random week to stop being snowy, but always start snow in week 36
  const stopWeek = Math.floor(Math.random() * 18) + 18;
  const yearWeek = week % 52;
  return (yearWeek < stopWeek || yearWeek >= 36) ? 1 : 0;
}
const generationEvery18Weeks = (week) => week % 18 === 0;

// configure the presented presets for the simulation, which can be tweaked after selection as well.
const simulationConfig = {
  scenarios: [
    {
      name: "Scenario 1",
      description: "No selection, large population, and a stable climate.",
      options: {
        selection: false,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 500,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: stableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
    {
      name: "Scenario 2",
      description: "No selection, small population, and a stable climate.",
      options: {
        selection: false,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 20,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: stableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
    {
      name: "Scenario 3",
      description: "Selection, large population, and a stable climate.",
      options: {
        selection: true,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 500,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: stableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
    {
      name: "Scenario 4",
      description: "Selection, small population, and a stable climate.",
      options: {
        selection: true,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 20,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: stableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
    {
      name: "Scenario 5",
      description: "Selection, large population, and a variable climate.",
      options: {
        selection: true,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 500,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: variableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
    {
      name: "Scenario 6",
      description: "Selection, small population, and a variable climate.",
      options: {
        selection: true,
        startWeek: 0,
        availableAlleles: basicAlleles,
        carryingCapacity: 20,
        baseSurvivalRate: 0.96,
        mismatchPenalty: 0.07,
        calculateSnowCoverage: variableClimate,
        shouldGenerateNewPopulation: generationEvery18Weeks,
      }
    },
  ]
}
export {
  simulationConfig,
  basicAlleles
}