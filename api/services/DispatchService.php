<?php
/**
 * Garment OS — Dispatch Domain Service
 * Handles Carton Packing Registries, Partial Logistics Consignments, and Gate Passes.
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/FinanceService.php';

class DispatchService {

    public static function registerPackedCarton(string $workOrderId, int $totalPieces, float $grossWeightKg, float $netWeightKg): array {
        $cartonId = Database::generateUuid('ctn');
        $barcode = "CTN-" . strtoupper(substr($workOrderId, -4)) . "-" . sprintf('%04d', mt_rand(1000, 9999));

        Database::execute(
            "INSERT INTO shipment_cartons (id, work_order_id, carton_barcode, gross_weight_kg, net_weight_kg, total_pieces, status)
             VALUES (?, ?, ?, ?, ?, ?, 'Packed')",
            [$cartonId, $workOrderId, $barcode, $grossWeightKg, $netWeightKg, $totalPieces]
        );

        return [
            'success'       => true,
            'cartonId'      => $cartonId,
            'cartonBarcode' => $barcode,
            'pieces'        => $totalPieces
        ];
    }

    public static function createShipment(string $orderId, string $transporterName, array $cartonIds, array $meta = []): array {
        return Database::transaction(function(PDO $db) use ($orderId, $transporterName, $cartonIds, $meta) {
            if (empty($cartonIds)) {
                throw new InvalidArgumentException("At least one packed carton is required to create a shipment.");
            }

            // Verify all selected cartons are currently 'Packed' and not already shipped
            $placeholders = implode(',', array_fill(0, count($cartonIds), '?'));
            $cartons = Database::query(
                "SELECT * FROM shipment_cartons WHERE id IN ($placeholders)",
                $cartonIds
            );

            foreach ($cartons as $c) {
                if ($c['status'] !== 'Packed' || !empty($c['shipment_id'])) {
                    throw new RuntimeException("CARTON_ALREADY_SHIPPED: Carton {$c['carton_barcode']} is already assigned or shipped.");
                }
            }

            $shipmentId = Database::generateUuid('shp');
            $shipmentNumber = 'SHP-' . date('Y') . '-' . sprintf('%04d', mt_rand(100, 9999));

            // 1. Create Shipment Record
            Database::execute(
                "INSERT INTO shipments (id, shipment_number, order_id, transporter_name, tracking_number, vehicle_number, driver_phone, e_way_bill_number, status, dispatched_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Dispatched', CURRENT_TIMESTAMP)",
                [
                    $shipmentId,
                    $shipmentNumber,
                    $orderId,
                    $transporterName,
                    $meta['trackingNumber'] ?? '',
                    $meta['vehicleNumber'] ?? 'TN-38-AX-9921',
                    $meta['driverPhone'] ?? '',
                    $meta['eWayBillNumber'] ?? ''
                ]
            );

            // 2. Mark Cartons as Shipped
            Database::execute(
                "UPDATE shipment_cartons SET status = 'Shipped', shipment_id = ? WHERE id IN ($placeholders)",
                array_merge([$shipmentId], $cartonIds)
            );

            // 3. Generate Security Gate Pass
            $gatePassId = Database::generateUuid('gp');
            $gatePassNumber = 'GP-' . date('Y') . '-' . sprintf('%04d', mt_rand(100, 9999));

            Database::execute(
                "INSERT INTO gate_passes (id, gate_pass_number, shipment_id, vehicle_number, total_cartons, issued_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [
                    $gatePassId,
                    $gatePassNumber,
                    $shipmentId,
                    $meta['vehicleNumber'] ?? 'TN-38-AX-9921',
                    count($cartonIds),
                    $meta['userId'] ?? 'SECURITY_GATE'
                ]
            );

            // 4. Trigger Automatic Tax Invoice Generation
            $shippedPieces = array_sum(array_column($cartons, 'total_pieces'));
            $invoice = FinanceService::generateSalesInvoiceForShipment($orderId, $shipmentId, $shippedPieces);

            return [
                'success'        => true,
                'shipmentId'     => $shipmentId,
                'shipmentNumber' => $shipmentNumber,
                'gatePassNumber' => $gatePassNumber,
                'totalCartons'   => count($cartonIds),
                'totalPieces'    => $shippedPieces,
                'invoiceNumber'  => $invoice['invoiceNumber'] ?? null
            ];
        });
    }
}
