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
                layCount: 0,
                plyCount: 0,
                cutQuantitiesBySize: {}, // { 'S': 250, 'M': 500, 'L': 500, 'XL': 250 }
                bundles: [], // [{ bundleNo: 1, size: 'M', range: '001-050', qty: 50 }]
                fabricIssuedKg: 0,
                actualCutPieces: 0,
                scrapFabricKg: 0,
                scrapPercentage: 0,
                cuttingSupervisor: '',
                status: 'In Progress' // In Progress | Completed
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
