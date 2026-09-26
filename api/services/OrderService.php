<?php
/**
 * Garment OS — Orders Domain Service
 * Handles normalized order creation, multi-style product lines, variants, sizes, and commercials.
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/WorkflowService.php';
require_once __DIR__ . '/ProductionService.php';
require_once __DIR__ . '/InventoryService.php';

class OrderService {

    public static function createOrder(array $payload): array {
        return Database::transaction(function(PDO $db) use ($payload) {
            // Validation
            if (empty($payload['orderNumber']) || empty($payload['customerId'])) {
                throw new InvalidArgumentException("Order number and customer ID are required.");
            }

            // Customer check
            $customer = Database::queryOne("SELECT id, name FROM customers WHERE id = ?", [$payload['customerId']]);
            $customerName = $customer ? $customer['name'] : ($payload['customerName'] ?? 'Unknown Customer');

            $orderId = !empty($payload['id']) ? $payload['id'] : Database::generateUuid('ord');
            $orderDate = $payload['orderDate'] ?? date('Y-m-d');
            $deliveryDate = $payload['deliveryDate'] ?? date('Y-m-d', strtotime('+30 days'));

            // 1. Order Header
            Database::execute(
                "INSERT INTO orders (id, order_number, customer_id, customer_name, order_date, delivery_date, status, priority, season, customer_po_reference, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?)",
                [
                    $orderId,
                    $payload['orderNumber'],
                    $payload['customerId'],
                    $customerName,
                    $orderDate,
                    $deliveryDate,
                    $payload['priority'] ?? 'Medium',
                    $payload['season'] ?? '',
                    $payload['customerPoReference'] ?? '',
                    $payload['notes'] ?? '',
                    $payload['createdBy'] ?? 'SYSTEM'
                ]
            );

            $calculatedSubtotal = 0.0;
            $itemsSummary = [];

            // 2. Order Line Items (Styles)
            $items = $payload['items'] ?? [];
            if (empty($items)) {
                // Fallback for single-product flat creation payload
                $items = [[
                    'styleCode'         => $payload['styleCode'] ?? ($payload['styleName'] ?? 'STYLE-001'),
                    'styleName'         => $payload['styleName'] ?? 'Custom Style',
                    'workflowPresetId'  => $payload['workflowPresetId'] ?? 'wp_standard_cmt',
                    'fabricComposition' => $payload['fabricComposition'] ?? '100% Cotton Single Jersey',
                    'targetGsm'         => (int)($payload['gsm'] ?? 180),
                    'fabricDia'         => $payload['fabricDia'] ?? 'Open Width',
                    'variants'          => $payload['variants'] ?? []
                ]];
            }

            foreach ($items as $item) {
                $itemId = Database::generateUuid('item');
                $presetId = $item['workflowPresetId'] ?? 'wp_standard_cmt';

                // Calculate item total quantity from variants/sizes
                $itemTotalQty = 0;
                $variants = $item['variants'] ?? [];
                foreach ($variants as $variant) {
                    $variantTotal = 0;
                    $sizes = $variant['sizes'] ?? [];
                    foreach ($sizes as $size) {
                        $variantTotal += (int)($size['orderedQuantity'] ?? $size['qty'] ?? 0);
                    }
                    $itemTotalQty += $variantTotal;
                }

                if ($itemTotalQty === 0 && isset($item['totalQuantity'])) {
                    $itemTotalQty = (int)$item['totalQuantity'];
                }

                Database::execute(
                    "INSERT INTO order_items (id, order_id, workflow_preset_id, style_code, style_name, fabric_composition, target_gsm, fabric_dia, total_quantity)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $itemId,
                        $orderId,
                        $presetId,
                        $item['styleCode'] ?? 'STYLE-01',
                        $item['styleName'] ?? 'Apparel Item',
                        $item['fabricComposition'] ?? 'Cotton Jersey',
                        (int)($item['targetGsm'] ?? 180),
                        $item['fabricDia'] ?? 'Open Width',
                        $itemTotalQty
                    ]
                );

                // 3. Variants & Sizes
                foreach ($variants as $variant) {
                    $variantId = Database::generateUuid('var');
                    $varTotal = 0;
                    $sizes = $variant['sizes'] ?? [];
                    foreach ($sizes as $size) {
                        $varTotal += (int)($size['orderedQuantity'] ?? $size['qty'] ?? 0);
                    }

                    Database::execute(
                        "INSERT INTO order_item_variants (id, order_item_id, color_name, color_code, pantone_ref, total_quantity)
                         VALUES (?, ?, ?, ?, ?, ?)",
                        [
                            $variantId,
                            $itemId,
                            $variant['colorName'] ?? 'Standard Color',
                            $variant['colorCode'] ?? '#000000',
                            $variant['pantoneRef'] ?? '',
                            $varTotal
                        ]
                    );

                    foreach ($sizes as $size) {
                        $sizeId = Database::generateUuid('siz');
                        Database::execute(
                            "INSERT INTO order_item_sizes (id, variant_id, size_code, ratio_factor, ordered_quantity)
                             VALUES (?, ?, ?, ?, ?)",
                            [
                                $sizeId,
                                $variantId,
                                $size['sizeCode'] ?? ($size['size'] ?? 'M'),
                                (int)($size['ratioFactor'] ?? 1),
                                (int)($size['orderedQuantity'] ?? ($size['qty'] ?? 0))
                            ]
                        );
                    }
                }

                $itemsSummary[] = [
                    'itemId'       => $itemId,
                    'styleCode'    => $item['styleCode'] ?? '',
                    'totalQty'     => $itemTotalQty
                ];
            }

            // 4. Commercials & Totals
            $commercials = $payload['commercials'] ?? [];
            $unitPrice = (float)($commercials['unitPrice'] ?? ($payload['unitPrice'] ?? 0.0));
            $totalOrderedQty = array_sum(array_column($itemsSummary, 'totalQty'));
            if ($totalOrderedQty === 0 && isset($payload['totalQuantity'])) {
                $totalOrderedQty = (int)$payload['totalQuantity'];
            }

            $subtotal = $unitPrice * $totalOrderedQty;
            $discount = (float)($commercials['discountAmount'] ?? 0.0);
            $taxPercent = (float)($commercials['taxPercent'] ?? 0.0);
            $taxable = max(0.0, $subtotal - $discount);
            $taxAmount = ($taxable * $taxPercent) / 100.0;
            $grandTotal = $taxable + $taxAmount;

            $commId = Database::generateUuid('comm');
            Database::execute(
                "INSERT INTO order_commercials (id, order_id, currency, unit_price, subtotal, discount_amount, tax_percent, tax_amount, grand_total, payment_terms, payment_received, balance_due)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?)",
                [
                    $commId,
                    $orderId,
                    $commercials['currency'] ?? 'USD',
                    $unitPrice,
                    $subtotal,
                    $discount,
                    $taxPercent,
                    $taxAmount,
                    $grandTotal,
                    $commercials['paymentTerms'] ?? 'Net 30',
                    $grandTotal
                ]
            );

            // 5. Order Status History Initial Entry
            Database::execute(
                "INSERT INTO order_status_history (id, order_id, from_status, to_status, remarks, user_id)
                 VALUES (?, ?, 'None', 'Draft', 'Initial Draft Order Created', ?)",
                [Database::generateUuid('osh'), $orderId, $payload['createdBy'] ?? 'SYSTEM']
            );

            return [
                'success'     => true,
                'orderId'     => $orderId,
                'orderNumber' => $payload['orderNumber'],
                'totalQty'    => $totalOrderedQty,
                'grandTotal'  => $grandTotal,
                'status'      => 'Draft'
            ];
        });
    }

    public static function confirmOrder(string $orderId): array {
        return Database::transaction(function(PDO $db) use ($orderId) {
            $order = Database::queryOne("SELECT * FROM orders WHERE id = ? OR order_number = ?", [$orderId, $orderId]);
            if (!$order) {
                throw new RuntimeException("Order not found: {$orderId}");
            }
            $orderId = $order['id'];
            if ($order['status'] === 'Confirmed' || $order['status'] === 'In_Production') {
                return ['success' => true, 'message' => 'Order is already confirmed', 'orderId' => $orderId];
            }

            // Update order status
            Database::execute("UPDATE orders SET status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [$orderId]);

            Database::execute(
                "INSERT INTO order_status_history (id, order_id, from_status, to_status, remarks, user_id)
                 VALUES (?, ?, ?, 'Confirmed', 'Order Confirmed by Sales Authority', 'SYSTEM')",
                [Database::generateUuid('osh'), $orderId, $order['status']]
            );

            // Initialize Work Orders for all product items
            $items = Database::query("SELECT * FROM order_items WHERE order_id = ?", [$orderId]);
            $createdWorkOrders = [];

            foreach ($items as $item) {
                $wo = ProductionService::createWorkOrderForItem($item['id']);
                $createdWorkOrders[] = $wo;
                
                // Automatically create BOM material reservations
                InventoryService::createBOMReservationForWorkOrder($wo['workOrderId'], $item['total_quantity']);
            }

            return [
                'success'        => true,
                'orderId'        => $orderId,
                'status'         => 'Confirmed',
                'workOrders'     => $createdWorkOrders
            ];
        });
    }

    public static function getOrderDetails(string $orderId): ?array {
        $order = Database::queryOne("SELECT * FROM orders WHERE id = ? OR order_number = ?", [$orderId, $orderId]);
        if (!$order) return null;

        $order['commercials'] = Database::queryOne("SELECT * FROM order_commercials WHERE order_id = ?", [$order['id']]);
        $order['history'] = Database::query("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC", [$order['id']]);
        
        $items = Database::query("SELECT * FROM order_items WHERE order_id = ?", [$order['id']]);
        foreach ($items as &$item) {
            $item['variants'] = Database::query("SELECT * FROM order_item_variants WHERE order_item_id = ?", [$item['id']]);
            foreach ($item['variants'] as &$variant) {
                $variant['sizes'] = Database::query("SELECT * FROM order_item_sizes WHERE variant_id = ?", [$variant['id']]);
            }
            $item['work_order'] = Database::queryOne("SELECT * FROM work_orders WHERE order_item_id = ?", [$item['id']]);
        }
        $order['items'] = $items;

        return $order;
    }
}
