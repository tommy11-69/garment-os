import { BaseRepository } from './BaseRepository.js';

class CalculatorRepository extends BaseRepository {
    constructor() {
        super('costings');
    }
}

export const calculatorRepository = new CalculatorRepository();
