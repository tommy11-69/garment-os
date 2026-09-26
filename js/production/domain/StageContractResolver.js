/**
 * Garment OS — Production Stage Contract Resolver
 * 
 * Dynamically resolves operational stage requirements, units, SAM benchmarks, 
 * size ratios, and mandatory quality gates from the Work Order snapshot and Product Tech Pack.
 */

export class StageContractResolver {
    /**
     * Resolves the runtime stage execution contract
     */
    static resolveContract(stageCode, order, activeProduct, stageExecution = null, workOrder = null) {
        const prod = activeProduct || {};
        const ord = order || {};
        const stg = stageExecution || {};
        const wo = workOrder || {};

        const totalPlannedQty = Number(stg.planned_qty) || Number(wo.planned_quantity) || Number(prod.qty) || Number(ord.qty) || 0;
        const inputQty = Number(stg.input_qty) || 0;
        const goodOutputQty = Number(stg.good_output_qty) || 0;
        const reworkQty = Number(stg.rework_qty) || 0;
        const scrapQty = Number(stg.scrap_qty) || 0;
        const consumedDownstream = Number(stg.consumed_downstream_qty) || 0;
        const availableDownstream = Math.max(0, goodOutputQty - consumedDownstream);

        // Product Style Specs
        const fabricName = prod.fabric?.type || ord.fabric || '100% Combed Cotton Single Jersey';
        const targetGsm = Number(prod.fabric?.gsm || ord.gsm || 180);
        const targetDia = Number(prod.fabric?.dia || ord.dia || 72);
        const isFleeceOrHoodie = String(prod.name || ord.product || '').toLowerCase().includes('hood') || String(fabricName).toLowerCase().includes('fleece');

        // Dynamic SAM (Standard Allowed Minutes) & Line Capacity
        const defaultSam = isFleeceOrHoodie ? 38.0 : 12.5;
        const sam = Number(prod.sam || defaultSam);
        const standardOperators = 30;
        const targetPerHour = Math.round((standardOperators * 60 / sam) * 0.85); // 85% efficiency benchmark

        // Size breakdown matrix
        const sizeMatrix = prod.sizes || ord.stageData?.cutting?.cutQuantitiesBySize || { 'S': 250, 'M': 500, 'L': 500, 'XL': 250 };

        // Determine units and operational gates based on stage code
        let inputUnit = 'Pcs';
        let outputUnit = 'Pcs';
        let qualityGates = [];
        let executionMode = stg.execution_mode || 'IN_HOUSE';

        switch (stageCode) {
            case 'procurement':
                inputUnit = 'POs';
                outputUnit = 'Kgs';
                qualityGates = ['SUPPLIER_PO_CONFIRMED', 'MATERIAL_AVAILABILITY_CHECK'];
                break;
            case 'winding':
                inputUnit = 'Kgs';
                outputUnit = 'Cones';
                qualityGates = ['TENSION_CALIBRATION_CHECK'];
                break;
            case 'knitting':
                inputUnit = 'Cones';
                outputUnit = 'Kgs';
                qualityGates = ['GREIGE_GSM_DIA_CHECK', 'NEEDLE_LIGHT_TABLE_PASS'];
                break;
            case 'dyeing':
                inputUnit = 'Kgs';
                outputUnit = 'Kgs';
                qualityGates = ['LAB_DIP_SHADE_APPROVAL', 'COMPACTING_SHRINKAGE_PASS'];
                break;
            case 'fabric':
                inputUnit = 'Rolls';
                outputUnit = 'Kgs';
                qualityGates = ['FOUR_POINT_QC_PASS', 'RELAXATION_24H_COMPLETE'];
                break;
            case 'cutting':
                inputUnit = 'Kgs';
                outputUnit = 'Pcs';
                qualityGates = ['MARKER_RATIO_VERIFIED', 'NOTCH_ACCURACY_CHECK'];
                break;
            case 'printing':
                inputUnit = 'Panels';
                outputUnit = 'Panels';
                qualityGates = ['PHYSICAL_STRIKE_OFF_APPROVED', 'WASH_FASTNESS_PASS'];
                break;
            case 'embroidery':
                inputUnit = 'Pcs';
                outputUnit = 'Pcs';
                qualityGates = ['DST_PROGRAM_VERIFIED', 'NEEDLE_PUNCTURE_CHECK'];
                break;
            case 'garment_wash':
            case 'wash':
                inputUnit = 'Pcs';
                outputUnit = 'Pcs';
                qualityGates = ['WASH_RECIPE_VERIFIED', 'POST_WASH_MEASUREMENT_PASS'];
                break;
            case 'stitching':
                inputUnit = 'Bundles';
                outputUnit = 'Pcs';
                qualityGates = ['FIRST_PIECE_APPROVAL', 'INLINE_QC_PASS'];
                break;
            case 'packing':
                inputUnit = 'Pcs';
                outputUnit = 'Cartons';
                qualityGates = ['NEEDLE_DETECTOR_PASS', 'AQL_FINAL_AUDIT_PASS'];
                break;
            case 'dispatch':
                inputUnit = 'Cartons';
                outputUnit = 'Shipment';
                qualityGates = ['GATE_PASS_ISSUED', 'E_WAY_BILL_VERIFIED'];
                break;
        }

        return {
            stageCode,
            stageExecutionId: stg.id || `${ord.id || 'ord'}:${stageCode}`,
            workOrderId: wo.id || stg.work_order_id || '',
            sequenceOrder: Number(stg.sequence_order) || 1,
            executionMode,
            status: stg.status || 'Pending',
            units: {
                input: inputUnit,
                output: outputUnit
            },
            quantities: {
                planned: totalPlannedQty,
                input: inputQty,
                good: goodOutputQty,
                rework: reworkQty,
                scrap: scrapQty,
                consumedDownstream,
                availableDownstream
            },
            specifications: {
                fabricName,
                targetGsm,
                targetDia,
                isFleeceOrHoodie,
                sam,
                targetPerHour,
                sizeMatrix
            },
            qualityGates,
            isCompleted: stg.status === 'Completed' || (goodOutputQty + scrapQty >= totalPlannedQty && totalPlannedQty > 0 && reworkQty === 0)
        };
    }
}
