/**
 * Garment OS — Phase P5 Workflow Dynamicity & Specialized Execution Acceptance Tests
 *
 * Tests:
 * 1. WST-001: Dynamic Workflow Resolution across all standard & vertical routes
 * 2. WST-002: Decoupled Embellishment Workspaces (Printing, Embroidery, Washing)
 * 3. WST-003: Dynamic Component Lookup via WorkspaceRegistry with Aliases
 * 4. WST-004: StageContractResolver Dynamic Contracts (Units, SAM, Gates)
 * 5. WST-005: Cutting 24h Relaxation Resting & Size Ratio Validation
 * 6. WST-006: Stitching Dynamic SAM Line Pacing & Pacing Efficiency
 * 7. WST-007: Packing 9-Point Needle Detector Calibration QC Gate
 * 8. WST-008: Backward Compatibility with Legacy Order Schemas & Aliases
 */

import assert from 'assert';
import { 
    STAGE_KEYS, 
    STAGE_DEFINITIONS, 
    WORKFLOW_ROUTES, 
    getProductWorkflowStages, 
    normalizeStageKey, 
    calculateOrderRollup 
} from '../js/production/domain/workflowEngine.js';

import { workspaceRegistry } from '../js/production/domain/WorkspaceRegistry.js';
import { StageContractResolver } from '../js/production/domain/StageContractResolver.js';

import { OverviewWorkspace } from '../js/production/stages/OverviewWorkspace.js';
import { ProcurementWorkspace } from '../js/production/stages/ProcurementWorkspace.js';
import { WindingWorkspace } from '../js/production/stages/WindingWorkspace.js';
import { KnittingWorkspace } from '../js/production/stages/KnittingWorkspace.js';
import { DyeingWorkspace } from '../js/production/stages/DyeingWorkspace.js';
import { FabricWorkspace } from '../js/production/stages/FabricWorkspace.js';
import { CuttingWorkspace } from '../js/production/stages/CuttingWorkspace.js';
import { PrintingWorkspace } from '../js/production/stages/PrintingWorkspace.js';
import { EmbroideryWorkspace } from '../js/production/stages/EmbroideryWorkspace.js';
import { WashingWorkspace } from '../js/production/stages/WashingWorkspace.js';
import { PrintWashWorkspace } from '../js/production/stages/PrintWashWorkspace.js';
import { StitchingWorkspace } from '../js/production/stages/StitchingWorkspace.js';
import { PackingWorkspace } from '../js/production/stages/PackingWorkspace.js';
import { DispatchWorkspace } from '../js/production/stages/DispatchWorkspace.js';

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  \x1b[32m✔\x1b[0m [PASS] ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  \x1b[31m✖\x1b[0m [FAIL] ${name}`);
        console.error(`    ${err.message}`);
    }
}

console.log('\n=============================================================');
console.log('GARMENT OS — PHASE P5 ACCEPTANCE TEST SUITE');
console.log('=============================================================\n');

// ── WST-001: Dynamic Workflow Resolution ─────────────────────────────────────
test('WST-001: Workflow Routes resolve distinct, valid stage sequences', () => {
    assert.deepStrictEqual(
        WORKFLOW_ROUTES.default,
        ['procurement', 'fabric', 'cutting', 'stitching', 'packing', 'dispatch'],
        'Standard CMT route mismatch'
    );

    assert.deepStrictEqual(
        WORKFLOW_ROUTES.print_before_stitch,
        ['procurement', 'fabric', 'cutting', 'printing', 'stitching', 'packing', 'dispatch'],
        'Print-first route mismatch'
    );

    assert.deepStrictEqual(
        WORKFLOW_ROUTES.wash_before_stitch,
        ['procurement', 'fabric', 'cutting', 'stitching', 'garment_wash', 'packing', 'dispatch'],
        'Wash route mismatch'
    );

    assert.deepStrictEqual(
        WORKFLOW_ROUTES.stitch_before_embroidery,
        ['procurement', 'fabric', 'cutting', 'stitching', 'embroidery', 'packing', 'dispatch'],
        'Embroidery route mismatch'
    );

    assert.deepStrictEqual(
        WORKFLOW_ROUTES.full_vertical,
        ['procurement', 'winding', 'knitting', 'dyeing', 'cutting', 'stitching', 'packing', 'dispatch'],
        'Full vertical route mismatch'
    );

    assert.deepStrictEqual(
        WORKFLOW_ROUTES.direct_fulfillment,
        ['procurement', 'dispatch'],
        'Direct trading route mismatch'
    );
});

// ── WST-002: Decoupled Embellishment Workspaces ──────────────────────────────
test('WST-002: Decoupled Stage Workspaces provide render and extractFormData interfaces', () => {
    const workspaces = [
        { name: 'PrintingWorkspace', ws: PrintingWorkspace },
        { name: 'EmbroideryWorkspace', ws: EmbroideryWorkspace },
        { name: 'WashingWorkspace', ws: WashingWorkspace },
        { name: 'CuttingWorkspace', ws: CuttingWorkspace },
        { name: 'StitchingWorkspace', ws: StitchingWorkspace },
        { name: 'PackingWorkspace', ws: PackingWorkspace },
        { name: 'WindingWorkspace', ws: WindingWorkspace },
        { name: 'KnittingWorkspace', ws: KnittingWorkspace },
        { name: 'DyeingWorkspace', ws: DyeingWorkspace }
    ];

    workspaces.forEach(({ name, ws }) => {
        assert(ws && typeof ws.render === 'function', `${name} must implement render()`);
        assert(ws && typeof ws.extractFormData === 'function', `${name} must implement extractFormData()`);
    });
});

// ── WST-003: WorkspaceRegistry Component Resolution & Aliases ────────────────
test('WST-003: WorkspaceRegistry dynamically maps stage codes and aliases', () => {
    // Register all
    workspaceRegistry.register('overview', OverviewWorkspace);
    workspaceRegistry.register('procurement', ProcurementWorkspace);
    workspaceRegistry.register('winding', WindingWorkspace);
    workspaceRegistry.register('knitting', KnittingWorkspace);
    workspaceRegistry.register('dyeing', DyeingWorkspace);
    workspaceRegistry.register('fabric', FabricWorkspace);
    workspaceRegistry.register('cutting', CuttingWorkspace);
    workspaceRegistry.register('printing', PrintingWorkspace);
    workspaceRegistry.register('embroidery', EmbroideryWorkspace);
    workspaceRegistry.register('washing', WashingWorkspace);
    workspaceRegistry.register('garment_wash', WashingWorkspace);
    workspaceRegistry.register('print_wash', PrintWashWorkspace);
    workspaceRegistry.register('stitching', StitchingWorkspace);
    workspaceRegistry.register('packing', PackingWorkspace);
    workspaceRegistry.register('dispatch', DispatchWorkspace);

    workspaceRegistry.registerAlias('wash', 'washing');
    workspaceRegistry.registerAlias('screen_print', 'printing');
    workspaceRegistry.registerAlias('dtg_print', 'printing');

    assert.strictEqual(workspaceRegistry.resolve('printing'), PrintingWorkspace, 'printing should resolve PrintingWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('embroidery'), EmbroideryWorkspace, 'embroidery should resolve EmbroideryWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('washing'), WashingWorkspace, 'washing should resolve WashingWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('garment_wash'), WashingWorkspace, 'garment_wash should resolve WashingWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('wash'), WashingWorkspace, 'wash alias should resolve WashingWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('screen_print'), PrintingWorkspace, 'screen_print alias should resolve PrintingWorkspace');
    assert.strictEqual(workspaceRegistry.resolve('print_wash'), PrintWashWorkspace, 'print_wash should resolve PrintWashWorkspace');
});

// ── WST-004: StageContractResolver Dynamic Contracts ─────────────────────────
test('WST-004: StageContractResolver resolves accurate execution contracts, units & quality gates', () => {
    const mockOrder = { id: 'ORD-7001', qty: 1000, product: 'Oversized Heavyweight Hoodie', fabric: '380 GSM French Terry Fleece' };
    const mockProduct = { name: 'Heavyweight Hoodie', qty: 1000, sam: 38.0 };

    // Cutting contract
    const cuttingContract = StageContractResolver.resolveContract('cutting', mockOrder, mockProduct, { planned_qty: 1000, input_qty: 250, good_output_qty: 1000 });
    assert.strictEqual(cuttingContract.units.input, 'Kgs');
    assert.strictEqual(cuttingContract.units.output, 'Pcs');
    assert.strictEqual(cuttingContract.quantities.planned, 1000);
    assert(cuttingContract.qualityGates.includes('MARKER_RATIO_VERIFIED'));

    // Printing contract
    const printingContract = StageContractResolver.resolveContract('printing', mockOrder, mockProduct);
    assert.strictEqual(printingContract.units.input, 'Panels');
    assert.strictEqual(printingContract.units.output, 'Panels');
    assert(printingContract.qualityGates.includes('PHYSICAL_STRIKE_OFF_APPROVED'));

    // Stitching contract with dynamic SAM
    const stitchingContract = StageContractResolver.resolveContract('stitching', mockOrder, mockProduct);
    assert.strictEqual(stitchingContract.specifications.sam, 38.0);
    assert.strictEqual(stitchingContract.units.input, 'Bundles');
    assert.strictEqual(stitchingContract.units.output, 'Pcs');
    assert(stitchingContract.qualityGates.includes('FIRST_PIECE_APPROVAL'));

    // Packing contract with Needle Detector gate
    const packingContract = StageContractResolver.resolveContract('packing', mockOrder, mockProduct);
    assert.strictEqual(packingContract.units.input, 'Pcs');
    assert.strictEqual(packingContract.units.output, 'Cartons');
    assert(packingContract.qualityGates.includes('NEEDLE_DETECTOR_PASS'));
});

// ── WST-005: Cutting Workspace 24h Relaxation & Marker Rendering ──────────────
test('WST-005: Cutting Workspace renders relaxation gate and dynamic size table', () => {
    const mockOrder = { id: 'ORD-8001', qty: 500 };
    const mockProduct = { name: 'Polo Shirt', qty: 500, sizes: { 'S': 100, 'M': 200, 'L': 150, 'XL': 50 } };
    const stageData = {
        cutting: {
            fabricIssuedKg: 110,
            scrapFabricKg: 8.8,
            cutQuantitiesBySize: { 'S': 100, 'M': 200, 'L': 150, 'XL': 50 },
            relaxationComplete: true,
            relaxationHours: 24
        }
    };

    const html = CuttingWorkspace.render(mockOrder, mockProduct, stageData);
    assert(html.includes('Fabric Relaxation &amp; Spreading QC') || html.includes('Fabric Relaxation & Spreading QC'), 'Must include 24h relaxation block');
    assert(html.includes('24h Relaxation Complete') || html.includes('24h Resting Completed'), 'Must show relaxation status');
    assert(html.includes('Size Ratio &amp; Actual Cut Count') || html.includes('Size Ratio & Actual Cut Count'), 'Must render size table');
    assert(!html.includes('PVA Panel Washing'), 'Must NOT contain inline PVA wash form (decoupled to washing stage)');
});

// ── WST-006: Stitching Workspace SAM Pacing Computation ─────────────────────
test('WST-006: Stitching Workspace calculates dynamic SAM pacing and line efficiency', () => {
    const mockOrderHoodie = { id: 'ORD-9001', qty: 600, product: 'Fleece Hoodie' };
    const mockProductHoodie = { name: 'Fleece Hoodie', qty: 600, sam: 38.0 };
    const htmlHoodie = StitchingWorkspace.render(mockOrderHoodie, mockProductHoodie, {});
    assert(htmlHoodie.includes('38 min') || htmlHoodie.includes('38.0 min') || htmlHoodie.includes('38'), 'Should display 38 SAM for Hoodie');

    const mockOrderTee = { id: 'ORD-9002', qty: 1000, product: 'Crewneck T-Shirt' };
    const mockProductTee = { name: 'Crewneck T-Shirt', qty: 1000, sam: 12.5 };
    const htmlTee = StitchingWorkspace.render(mockOrderTee, mockProductTee, {});
    assert(htmlTee.includes('12.5 min') || htmlTee.includes('12.5'), 'Should display 12.5 SAM for T-Shirt');
});

// ── WST-007: Packing Workspace 9-Point Needle Detector QC Gate ───────────────
test('WST-007: Packing Workspace renders 9-Point Needle Detector calibration card', () => {
    const mockOrder = { id: 'ORD-9005', qty: 300 };
    const mockProduct = { name: 'Export Polo', qty: 300 };
    const stageData = {
        packing: {
            needleDetectorPassed: true,
            detectorSensitivityMm: '1.0mm Fe',
            cartons: [
                { cartonNo: 1, totalPcs: 60, grossWeightKg: 15.6 }
            ]
        }
    };

    const html = PackingWorkspace.render(mockOrder, mockProduct, stageData);
    assert(html.includes('9-Point Needle Detector QC'), 'Must include 9-Point Needle Detector QC section');
    assert(html.includes('1.0mm Fe'), 'Must display 1.0mm Fe sensitivity');
});

// ── WST-008: Dynamic Normalization & Backward Compatibility ──────────────────
test('WST-008: normalizeStageKey maps discrete and legacy stages accurately', () => {
    assert.strictEqual(normalizeStageKey('printing'), 'printing');
    assert.strictEqual(normalizeStageKey('Screen Print'), 'printing');
    assert.strictEqual(normalizeStageKey('DTG Print'), 'printing');
    assert.strictEqual(normalizeStageKey('embroidery'), 'embroidery');
    assert.strictEqual(normalizeStageKey('Multi-Head Tajima'), 'embroidery');
    assert.strictEqual(normalizeStageKey('garment_wash'), 'garment_wash');
    assert.strictEqual(normalizeStageKey('Enzyme Wash'), 'garment_wash');
    assert.strictEqual(normalizeStageKey('print_wash'), 'print_wash');
    assert.strictEqual(normalizeStageKey('cutting'), 'cutting');
    assert.strictEqual(normalizeStageKey('sewing'), 'stitching');
});

console.log('\n-------------------------------------------------------------');
console.log(`RESULTS: ${passedCount} / ${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
console.log('-------------------------------------------------------------\n');

if (passedCount < totalCount) {
    process.exit(1);
}
