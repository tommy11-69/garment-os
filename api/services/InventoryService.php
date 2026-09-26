<?php
/**
 * Garment OS — Inventory Domain Service
 * Handles Hard Material Reservations, Stock on Hand (SOH), Double-Entry Stock Ledger, and Floor Issues.
 */

require_once __DIR__ . '/../db.php';

class InventoryService {

    public static function createBOMReservationForWorkOrder(string $workOrderId, int $garmentQty): array {
        return Database::transaction(function(PDO $db) use ($workOrderId, $garmentQty) {
            // Standard garment fabric estimation: ~0.25 kg per piece
            $estimatedFabricKg = $garmentQty * 0.25;

            // Find primary fabric inventory item
            $fabricItem = Database::queryOne("SELECT * FROM inventory_items WHERE category = 'Fabric' LIMIT 1");
            if (!$fabricItem) {
                // Initialize a default fabric item if none exists
                $fabricItemId = Database::generateUuid('inv');
                Database::execute(
                    "INSERT INTO inventory_items (id, item_code, item_name, category, unit_of_measure, current_stock, allocated_stock, available_stock)
                     VALUES (?, 'FAB-COTTON-01', '100% Combed Cotton Single Jersey 180 GSM', 'Fabric', 'Kgs', 10000.00, 0.00, 10000.00)",
                    [$fabricItemId]
                );
                $fabricItem = Database::queryOne("SELECT * FROM inventory_items WHERE id = ?", [$fabricItemId]);
            }

            $reservationId = Database::generateUuid('res');
            Database::execute(
                "INSERT INTO material_reservations (id, work_order_id, item_id, reserved_qty, issued_qty, status)
                 VALUES (?, ?, ?, ?, 0.00, 'Active')",
                [$reservationId, $workOrderId, $fabricItem['id'], $estimatedFabricKg]
            );

            // Update live stock allocations
            Database::execute(
                "UPDATE inventory_items 
                 SET allocated_stock = allocated_stock + ?, available_stock = available_stock - ?
                 WHERE id = ?",
                [$estimatedFabricKg, $estimatedFabricKg, $fabricItem['id']]
            );

            return [
                'reservationId'  => $reservationId,
                'workOrderId'    => $workOrderId,
                'itemId'         => $fabricItem['id'],
                'reservedFabric' => $estimatedFabricKg
            ];
        });
    }

    public static function issueMaterial(string $reservationId, float $issueQty, string $issuedBy = 'STORE_CLERK', string $receivedBy = 'CUTTING_MASTER'): array {
        return Database::transaction(function(PDO $db) use ($reservationId, $issueQty, $issuedBy, $receivedBy) {
            $reservation = Database::queryOne("SELECT * FROM material_reservations WHERE id = ?", [$reservationId]);
            if (!$reservation) {
                throw new RuntimeException("Material reservation not found: {$reservationId}");
            }

            $itemId = $reservation['item_id'];
            $item = Database::queryOne("SELECT * FROM inventory_items WHERE id = ?", [$itemId]);

            if ((float)$item['current_stock'] < $issueQty) {
                throw new RuntimeException("INSUFFICIENT_STOCK: Current: {$item['current_stock']}, Requested: {$issueQty}");
            }

            $issueId = Database::generateUuid('iss');
            $issueNumber = 'ISS-' . date('Y') . '-' . sprintf('%04d', mt_rand(100, 9999));

            // 1. Record Issue Voucher
            Database::execute(
                "INSERT INTO material_issues (id, issue_number, reservation_id, quantity_issued, issued_by, received_by)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$issueId, $issueNumber, $reservationId, $issueQty, $issuedBy, $receivedBy]
            );

            // 2. Update Reservation Progress
            Database::execute(
                "UPDATE material_reservations SET issued_qty = issued_qty + ? WHERE id = ?",
                [$issueQty, $reservationId]
            );

            // 3. Decrement Inventory & Allocated Stock
            Database::execute(
                "UPDATE inventory_items 
                 SET current_stock = current_stock - ?, allocated_stock = allocated_stock - ?
                 WHERE id = ?",
                [$issueQty, $issueQty, $itemId]
            );

            // 4. Double-Entry Stock Ledger
            Database::execute(
                "INSERT INTO stock_ledger (id, item_id, transaction_type, quantity, reference_type, reference_id, user_id)
                 VALUES (?, ?, 'MATERIAL_ISSUE', ?, 'MATERIAL_ISSUE', ?, ?)",
                [Database::generateUuid('sl'), $itemId, $issueQty, $issueId, $issuedBy]
            );

            return [
                'success'      => true,
                'issueId'      => $issueId,
                'issueNumber'  => $issueNumber,
                'quantity'     => $issueQty,
                'remainingRes' => (float)$reservation['reserved_qty'] - ((float)$reservation['issued_qty'] + $issueQty)
            ];
        });
    }
}
