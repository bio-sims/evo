export interface ClimateGenerator {
    week: number;
    temperature: number;
    friendlyName: string;
    /**
     * Creates a new ClimateGenerator
     * @param week - The week of the year
     * @param temperature - The temperature in degrees Celsius
     */
    constructor(week: number, temperature: number): void;
    advanceWeek(): void;
    getSnowCoverage(): number;
}
