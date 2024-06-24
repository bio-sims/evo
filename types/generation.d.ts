export interface GenerationGenerator {
    week: number;
    advanceWeek(): void;
    shouldGenerate(): boolean;
}
