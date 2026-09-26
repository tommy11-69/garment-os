<?php
/**
 * Garment OS — Production Domain Service
 * Handles Work Orders, Immutable Stage Snapshots, Continuous-Flow Quantity Ledger, Bundles & QC.
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/WorkflowService.php';

class ProductionService {

    public static function createWorkOrderForItem(string $orderItemId): array {
        $item = Database::queryOne("SELECT * FROM order_items WHERE id = ?", [$orderItemId]);
        if (!$item) {
            throw new RuntimeException("Order item not found: {$orderItemId}");
        }

        // Fetch current snapshot version of preset
        $presetVersion = WorkflowService::getLatestVersion($item['workflow_preset_id']);
        if (!$presetVersion) {
            // Fallback to standard CMT version 1
            $presetVersion = Database::queryOne("SELECT * FROM workflow_preset_versions WHERE preset_id = 'wp_standard_cmt' AND is_current = 1");
        }

        $workOrderId = Database::generateUuid('wo');
        $woNumber = 'WO-' . strtoupper(substr($item['id'], -6));

        Database::execute(
            "INSERT INTO work_orders (id, work_order_number, order_item_id, workflow_version_id, planned_quantity, status)
             VALUES (?, ?, ?, ?, ?, 'In_Production')",
            [$workOrderId, $woNumber, $orderItemId, $presetVersion['id'], $item['total_quantity']]
        );

        // Instantiate concrete stage_executions rows from snapshot JSON
        $stages = json_decode($presetVersion['stages_json'], true) ?: [];
        foreach ($stages as $stage) {
            $stageId = Database::generateUuid('stg');
            Database::execute(
                "INSERT INTO stage_executions (id, work_order_id, stage_code, sequence_order, execution_mode, status, planned_qty, unit_of_measure)
                 VALUES (?, ?, ?, ?, ?, 'Pending', ?, 'Pcs')",
                [
                    $stageId,
                    $workOrderId,
                    $stage['code'],
                    (int)($stage['seq'] ?? 1),
                    $stage['mode'] ?? 'IN_HOUSE',
                    $item['total_quantity']
                ]
            );
        }

        return [
            'workOrderId'     => $workOrderId,
            'workOrderNumber' => $woNumber,
            'orderItemId'     => $orderItemId,
            'stagesCount'     => count($stages)
        ];
    }

    public static function recordStageOutput(string $stageExecutionId, string $entryType, float $quantity, string $unit = 'Pcs', array $meta = []): array {
        return Database::transaction(function(PDO $db) use ($stageExecutionId, $entryType, $quantity, $unit, $meta) {
            if ($quantity <= 0) {
                throw new InvalidArgumentException("Quantity must be greater than zero.");
            }

            // Pessimistic Row Lock on Stage Execution
            $stage = Database::queryOne("SELECT * FROM stage_executions WHERE id = ?", [$stageExecutionId]);
            if (!$stage && strpos($stageExecutionId, ':') !== false) {
                list($refId, $stageCode) = explode(':', $stageExecutionId, 2);
                $stage = Database::queryOne(
                    "SELECT se.* FROM stage_executions se
                     JOIN work_orders wo ON se.work_order_id = wo.id
                     JOIN order_items oi ON wo.order_item_id = oi.id
                     JOIN orders o ON oi.order_id = o.id
                     WHERE (o.id = ? OR o.order_number = ? OR wo.id = ? OR wo.work_order_number = ?)
                       AND se.stage_code = ?
                     ORDER BY se.sequence_order ASC LIMIT 1",
                    [$refId, $refId, $refId, $refId, $stageCode]
                );
            }
            if (!$stage) {
                throw new RuntimeException("Stage execution not found: {$stageExecutionId}");
            }
            $stageExecutionId = $stage['id'];

            $ledgerId = Database::generateUuid('sql');
            Database::execute(
                "INSERT INTO stage_quantity_ledger (id, stage_execution_id, entry_type, quantity, unit_of_measure, source_reference_type, source_reference_id, notes, operator_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $ledgerId,
                    $stageExecutionId,
                    $entryType,
                    $quantity,
                    $unit,
                    $meta['sourceType'] ?? null,
                    $meta['sourceId'] ?? null,
                    $meta['notes'] ?? '',
                    $meta['operatorId'] ?? 'OPERATOR'
                ]
            );

            // Re-aggregate and update stage execution cached totals atomically
            $totals = Database::queryOne(
                "SELECT 
                    SUM(CASE WHEN entry_type = 'INPUT' THEN quantity ELSE 0 END) as total_input,
                    SUM(CASE WHEN entry_type IN ('OUTPUT_GOOD', 'REWORK_PASSED') THEN quantity ELSE 0 END) as total_good,
                    SUM(CASE WHEN entry_type = 'REWORK_GENERATED' THEN quantity ELSE 0 END) - 
                    SUM(CASE WHEN entry_type IN ('REWORK_PASSED', 'REWORK_SCRAPPED') THEN quantity ELSE 0 END) as active_rework,
                    SUM(CASE WHEN entry_type IN ('SCRAP_DIRECT', 'REWORK_SCRAPPED') THEN quantity ELSE 0 END) as total_scrap
                 FROM stage_quantity_ledger WHERE stage_execution_id = ?",
                [$stageExecutionId]
            );

            $newInput = (float)($totals['total_input'] ?? 0);
            $newGood = (float)($totals['total_good'] ?? 0);
            $newRework = max(0.0, (float)($totals['active_rework'] ?? 0));
            $newScrap = (float)($totals['total_scrap'] ?? 0);

            $newStatus = ($newGood + $newScrap >= $stage['planned_qty'] && $newRework == 0) ? 'Completed' : 'In_Progress';

            Database::execute(
                "UPDATE stage_executions 
                 SET input_qty = ?, good_output_qty = ?, rework_qty = ?, scrap_qty = ?, status = ?,
                     started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                     completed_at = CASE WHEN ? = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
                 WHERE id = ?",
                [$newInput, $newGood, $newRework, $newScrap, $newStatus, $newStatus, $stageExecutionId]
            );

            return [
                'success'           => true,
                'stageExecutionId'  => $stageExecutionId,
                'entryType'         => $entryType,
                'quantity'          => $quantity,
                'totals'            => [
                    'input'  => $newInput,
                    'good'   => $newGood,
                    'rework' => $newRework,
                    'scrap'  => $newScrap,
                    'status' => $newStatus
                ]
            ];
        });
    }

    public static function consumeUpstreamOutputAtomic(string $upstreamStageId, float $requestedQty): array {
        return Database::transaction(function(PDO $db) use ($upstreamStageId, $requestedQty) {
            $stage = Database::queryOne("SELECT id, good_output_qty, consumed_downstream_qty FROM stage_executions WHERE id = ?", [$upstreamStageId]);
            if (!$stage) {
                throw new RuntimeException("Upstream stage not found: {$upstreamStageId}");
            }

            $available = (float)$stage['good_output_qty'] - (float)$stage['consumed_downstream_qty'];
            if ($requestedQty > $available) {
                throw new RuntimeException("INSUFFICIENT_UPSTREAM_OUTPUT: Available: {$available}, Requested: {$requestedQty}");
            }

            Database::execute(
                "UPDATE stage_executions SET consumed_downstream_qty = consumed_downstream_qty + ? WHERE id = ?",
                [$requestedQty, $upstreamStageId]
            );

            return [
                'success'      => true,
                'consumedQty'  => $requestedQty,
                'remainingQty' => $available - $requestedQty
            ];
        });
    }

    public static function generateBundlesForCutting(string $workOrderId, string $variantId, array $sizeRatios, int $plyCount): array {
        return Database::transaction(function(PDO $db) use ($workOrderId, $variantId, $sizeRatios, $plyCount) {
            $createdBundles = [];
            $bundleSeq = 1;

            foreach ($sizeRatios as $sizeCode => $ratio) {
                $piecesInBundle = (int)$ratio * $plyCount;
                if ($piecesInBundle <= 0) continue;

                $bundleId = Database::generateUuid('bnd');
                $barcode = "BND-" . strtoupper(substr($workOrderId, -4)) . "-{$sizeCode}-" . sprintf('%03d', $bundleSeq++);

                Database::execute(
                    "INSERT INTO production_bundles (id, work_order_id, variant_id, bundle_barcode, size_code, ply_start, ply_end, piece_count, status)
                     VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'Cut')",
                    [$bundleId, $workOrderId, $variantId, $barcode, $sizeCode, $plyCount, $piecesInBundle]
                );

                $createdBundles[] = [
                    'bundleId'   => $bundleId,
                    'barcode'    => $barcode,
                    'sizeCode'   => $sizeCode,
                    'pieceCount' => $piecesInBundle
                ];
            }

            return [
                'success' => true,
                'workOrderId' => $workOrderId,
                'bundlesCount' => count($createdBundles),
                'bundles' => $createdBundles
            ];
        });
    }

    public static function logStageQC(string $stageExecutionId, array $qcData): array {
        $qcId = Database::generateUuid('qc');
        Database::execute(
            "INSERT INTO stage_qc_logs (id, stage_execution_id, inspection_type, sample_size, defects_count, result, defect_breakdown, inspector_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $qcId,
                $stageExecutionId,
                $qcData['inspectionType'] ?? 'In_Line_QC',
                (int)($qcData['sampleSize'] ?? 10),
                (int)($qcData['defectsCount'] ?? 0),
                $qcData['result'] ?? 'PASS',
                json_encode($qcData['defects'] ?? []),
                $qcData['inspectorId'] ?? 'QA_INSPECTOR'
            ]
        );

        return ['success' => true, 'qcId' => $qcId, 'result' => $qcData['result'] ?? 'PASS'];
    }
}
