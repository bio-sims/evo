export interface GenerationGenerator {
    week: number;
    friendlyName: string;
    advanceWeek(): void;
    shouldGenerate(): boolean;
}
