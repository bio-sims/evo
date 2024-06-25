export default
{
  "alleleSets": {
    "basicAlleles": [
      {
        "id": 1,
        "name": "Allele Br15.Wh36",
        "type": "coat",
        "brownWeek": 15,
        "brownRate": 1,
        "whiteWeek": 36,
        "whiteRate": 1,
        "geneColor": "#ff0000"
      },
      {
        "id": 2,
        "name": "Allele Br24.Wh36",
        "type": "coat",
        "brownWeek": 24,
        "brownRate": 1,
        "whiteWeek": 36,
        "whiteRate": 1,
        "geneColor": "#80ff00"
      },
      {
        "id": 3,
        "name": "Allele Br26.Wh36",
        "type": "coat",
        "brownWeek": 26,
        "brownRate": 1,
        "whiteWeek": 36,
        "whiteRate": 1,
        "geneColor": "#00ffff"
      },
      {
        "id": 4,
        "name": "Allele Br35.Wh36",
        "type": "coat",
        "brownWeek": 35,
        "brownRate": 1,
        "whiteWeek": 36,
        "whiteRate": 1,
        "geneColor": "#8000ff"
      }
    ]
  },
  "scenarios": [
    {
      "name": "Scenario 1",
      "description": "No selection, large population, and a stable climate.",
      "options": {
        "selection": false,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 500,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralStableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    },
    {
      "name": "Scenario 2",
      "description": "No selection, small population, and a stable climate.",
      "options": {
        "selection": false,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 20,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralStableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    },
    {
      "name": "Scenario 3",
      "description": "Selection, large population, and a stable climate.",
      "options": {
        "selection": true,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 500,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralStableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    },
    {
      "name": "Scenario 4",
      "description": "Selection, small population, and a stable climate.",
      "options": {
        "selection": true,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 20,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralStableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    },
    {
      "name": "Scenario 5",
      "description": "Selection, large population, and a variable climate.",
      "options": {
        "selection": true,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 500,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralVariableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    },
    {
      "name": "Scenario 6",
      "description": "Selection, small population, and a variable climate.",
      "options": {
        "selection": true,
        "startWeek": 0,
        "availableAlleles": "basicAlleles",
        "carryingCapacity": 20,
        "baseSurvivalRate": 0.96,
        "mismatchPenalty": 0.07,
        "climateGenerator": "IntegralVariableClimate",
        "generationGenerator": "GenerationEvery18Weeks"
      }
    }
  ]
}
