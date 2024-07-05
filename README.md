# evo

Evo is a population genetics simulation. See the [hosted wiki page](https://bio-sims.github.io/evo/wiki) or wiki HTML file for more general information.

ES6 modules are used and thus are subject to same-origin policy. If you want to run this simulation locally, you will need a simple local server (e.g. live server on vscode, nginx, etc.).

If for some reason in the future jsdelivr or npm does not have the necessary ES module files, `main.js` depends on `chart.js@4.4.3` and `seedrandom@3.0.5` and can be replaced locally.

## Configuration

All configuration is present in the `sim.config.js` file.

### alleleSets

This is an array containing sets of allele objects. The name of the set can be referenced in presets/scenarios. Each allele should have the following properties, though a question mark indicates that the property is optional.

| Property   | Type           | Description |
| ---------- | -------------- | ----------- |
| id         | Integer        | Unique identifier for the allele. |
| name       | String         | Friendly display name of the allele. |
| type       | String         | The type of the allele. Currently, coat alleles are used. |
| brownWeek  | Integer        | Week of the year a homozygote will switch its coat from white to brown. |
| brownRate  | Float          | Decimal rate at which a homozygote will switch its coat from white to brown, with 1 being instant. |
| whiteWeek  | Integer        | Week of the year a homozygote will switch its coat from brown to white. |
| whiteRate  | Float          | Decimal rate at which a homozygote will switch its coat from brown to white, with 1 being instant. |
| geneColor? | Hex RGB String | Color of the allele when displayed across the simulation. |

#### scenarios

This is an array containing sets of scenario objects. These will be displayed in the preset panel of the simulation. The scenario should have a `name`, `description`, and `options` object. The `options` object should contain the following properties, though a question mark indicates that the property is optional.

| Property            | Type    | Description |
| ------------------- | ------- | ----------- |
| selection           | Boolean | Whether or not selection should be enabled. |
| startWeek           | Integer | Week of the year the simulation will start on. (0 - 51) |
| availableAlleles    | String  | Name of the allele set to use for the simulation. Must be defined in alleleSets. |
| carryingCapacity    | Integer | Maximum number of hares that can be supported by the environment. Non-negative. |
| baseSurvivalRate    | Float   | Base survival rate of hares in the environment. (0.0 - 1.0) |
| mismatchPenalty     | Float   | Penalty applied to hares that do not match their environment. (0.0 - 1.0) |
| climateGenerator    | String  | Name of the climate function to use for the simulation. |
| generationGenerator | String  | Name of the generation function to use for the simulation. |
| seed?               | String  | Seed used to generate the random numbers for the simulation. If not provided, a random seed will be used. |

##### Currently available climateGenerators

| Function Name           | Description |
| ----------------------- | ----------- |
| IntegralStableClimate   | Every year, the first snowless day will fall within +/- 1 of a randomly chosen base week between 21 and 28. |
| IntegralVariableClimate | The first snowless day of the year drifts towards 0, slowing as it approaches it. Initial week is randomly between week 28 and 30. |

##### Currently available generationGeneartors

| Function Name           | Description |
| ----------------------- | ----------- |
| GenerationEvery18Weeks  | A new generation spawns every 18 weeks. |

Additional classes defining gnerators can be added in `climate.js` or `generation.js`. Note that they need to be imported and subsequently initialized in `climateFunctions` and `generationFunctions`. No additional modification is needed and they will be automatically re-initialized at the start of each simulation run.

## Authors and Citations

See <https://bio-sims.github.io/evo/wiki/#references>.
