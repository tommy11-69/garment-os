import { BaseRepository } from './BaseRepository.js?v=5.2';

class CalculatorRepository extends BaseRepository {
    constructor() {
        super('costings');
    }
}

export const calculatorRepository = new CalculatorRepository();
