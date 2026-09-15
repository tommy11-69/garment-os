/**
 * Garment OS — Production Stage Schemas & Operational Normalizers
 * 
 * Each stage workspace owns the distinct operational data specific to its process.
 */

export const StageSchemas = {
    procurement: {
        getDefaults() {
            return {
                supplierId: '',
                supplierName: '',
                poNumber: '',
                yarnKgOrdered: 0,
                yarnKgReceived: 0,
                trimsOrdered: true,
                trimsReceived: false,
                expectedArrival: '',
                challanNumber: '',
                notes: '',
                status: 'Pending' // Pending | Partially Received | Received
            };
        }
    },

    fabric: {
        getDefaults() {
            return {
                lotNumber: '',
                rollsReceived: 0,
                totalKg: 0,
                gsm: 180,
                dia: 72,
                colorShade: '',
                shrinkagePercentage: '3-4%',
                labDipStatus: 'Approved', // Pending | Approved | Rejected
                fabricDefectsCount: 0,
                inspectionScore: 'Pass', // Pass | Hold | Reject
                readyForCutting: false,
                notes: ''
            };
        }
    },

    cutting: {
        getDefaults() {
            return {
                markerLengthMeters: 0,
                layCount:           0,
                plyCount:           0,
                cutQuantitiesBySize: {}, // { 'S': 250, 'M': 500, 'L': 500, 'XL': 250 }
                bundles:            [], // [{ bundleNo: 1, size: 'M', range: '001-050', qty: 50 }]
                fabricIssuedKg:     0,
                actualCutPieces:    0,
                scrapFabricKg:      0,
                scrapPercentage:    0,
                cuttingSupervisor:  '',
                status:             'In Progress', // In Progress | Completed
                // Post-Cutting PVA Panel Washing (optional step)
                pvaWashEnabled:      false,   // toggled on per-order if PVA wash required
                pvaPanelsDispatched: 0,        // number of panels sent for PVA wash
                pvaVendorName:       '',       // 'In-House' or external wash vendor
                pvaExpectedReturn:   '',       // expected return date (ISO date string)
                pvaStatus:          'Pending', // Pending | Sent | Received | Completed
                pvaNotes:           ''         // any wash instructions / notes
            };
        }
    },

    print_wash: {
        getDefaults() {
            return {
                technique: 'Screen Print', // Screen Print | DTF | Embroidery | Bio-Wash | Enzyme Wash
                subType: 'Plastisol',
                strikeOffApproved: false,
                strikeOffPhotoUrl: '',
                panelsDispatched: 0,
                panelsReceived: 0,
                rejectedPanels: 0,
                processorVendorName: '',
                dcNumber: '',
                expectedReturnDate: '',
                status: 'In Progress' // Dispatched | Received | QC Complete
            };
        }
    },

    stitching: {
        getDefaults() {
            return {
                lineId: 'Sewing Line 1',
                supervisorName: '',
                dailyTarget: 400,
                completedPieces: 0,
                hourlyLogs: [], // [{ hour: '09:00-10:00', target: 50, output: 48 }]
                defects: {
                    skipStitch: 0,
                    unevenSeam: 0,
                    brokenStitch: 0,
                    oilStain: 0,
                    measurementDeviation: 0
                },
                repairedPieces: 0,
                rejectedPieces: 0,
                status: 'In Progress' // Allocated | In Progress | Completed
            };
        }
    },

    packing: {
        getDefaults() {
            return {
                trimmingChecked: true,
                steamIronedCount: 0,
                polybaggedCount: 0,
                cartons: [], // [{ cartonNo: 1, boxBarcode: 'BX-001', sizes: { 'M': 30, 'L': 30 }, totalPcs: 60, grossWeightKg: 14.5 }]
                totalCartons: 0,
                totalNetWeightKg: 0,
                totalGrossWeightKg: 0,
                labelsPrinted: false,
                status: 'In Progress' // Packing | Cartons Ready | Sealed
            };
        }
    },

    dispatch: {
        getDefaults() {
            return {
                dcNumber: '',
                gatePassNumber: '',
                eWayBillNumber: '',
                transporterName: 'Local Transport',
                driverName: '',
                driverPhone: '',
                vehicleNumber: '',
                trackingOrLrNo: '',
                totalBoxesDispatched: 0,
                dispatchDate: new Date().toISOString().split('T')[0],
                deliveredDate: '',
                status: 'Ready' // Ready | In Transit | Delivered
            };
        }
    },

    // ── Full Vertical Integration schemas (Yarn-to-Garment) ───────────────

    winding: {
        getDefaults() {
            return {
                machineId:      '',    // Winding machine identifier (e.g. 'WM-01')
                machineType:    '',    // Auto-cone / Precision / etc.
                yarnCount:      '',    // Yarn count, e.g. '30/1 Combed Cotton'
                yarnKgLoaded:   0,     // Total yarn kg loaded onto machine
                coneCount:      0,     // Number of cones wound
                tensionSetting: '',    // Tension value, e.g. '12 cN'
                breakageCount:  0,     // Yarn breakage incidents logged
                supervisorName: '',
                shiftDate:      '',
                notes:          '',
                status:         'In Progress' // In Progress | Completed
            };
        }
    },

    knitting: {
        getDefaults() {
            return {
                machineId:          '',    // Circular knitting machine ID (e.g. 'CKM-03')
                machineGauge:       28,    // Machine gauge (e.g. 24G, 28G, 36G)
                machineOperator:    '',
                productionRateKgHr: 0,     // Actual kg output per hour
                fabricKgProduced:   0,     // Total grey fabric kg knitted
                rollsProduced:      0,     // Number of greige rolls produced
                targetGsm:          180,   // GSM target from order spec
                actualGsm:          0,     // Actual measured GSM
                targetDia:          34,    // Dia target from order spec (inches)
                actualDia:          0,     // Actual measured dia (inches)
                defectivePanels:    0,     // Panels rejected during inspection
                shiftDate:          '',
                notes:              '',
                status:             'In Progress' // In Progress | QC | Released
            };
        }
    },

    dyeing: {
        getDefaults() {
            return {
                dyeingLotNumber:    '',    // Internal dyeing lot reference
                dyeingVendor:       '',    // 'In-House' or external processor name
                fabricKgDyed:       0,     // Total grey fabric kg sent for dyeing
                colorReference:     '',    // Pantone / buyer shade reference
                labDipReference:    '',    // Internal lab dip code
                shadeApproved:      false, // Buyer shade approval flag
                compactingDone:     false, // Compacting process completed flag
                compactedGsm:       0,     // Post-compact GSM
                compactedDia:       0,     // Post-compact dia (inches)
                shrinkageResult:    '',    // e.g. '3.5% warp / 2.8% weft'
                colorfastnessGrade: '',    // e.g. '4/5 Washing | 4 Rubbing'
                readyForCutting:    false, // Final release gate (requires shade + compacting)
                notes:              '',
                status:             'In Progress' // In Progress | Compacting | QC | Released
            };
        }
    }
};

/**
 * Ensures an order has fully initialized stageData structures
 */
export function hydrateStageData(rawStageData = {}) {
    const sd = (typeof rawStageData === 'object' && rawStageData !== null) ? { ...rawStageData } : {};

    for (const [stageKey, schema] of Object.entries(StageSchemas)) {
        if (!sd[stageKey] || typeof sd[stageKey] !== 'object') {
            sd[stageKey] = schema.getDefaults();
        } else {
            sd[stageKey] = { ...schema.getDefaults(), ...sd[stageKey] };
        }
    }

    return sd;
}
