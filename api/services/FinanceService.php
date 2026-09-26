<?php
/**
 * Garment OS — Finance & Billing Domain Service
 * Manages Sales Invoices, Double-Entry General Ledger (GL) Postings, and Payment Receipts.
 */

require_once __DIR__ . '/../db.php';

class FinanceService {

    public static function generateSalesInvoiceForShipment(string $orderId, string $shipmentId, int $shippedQuantity): array {
        return Database::transaction(function(PDO $db) use ($orderId, $shipmentId, $shippedQuantity) {
            $order = Database::queryOne("SELECT * FROM orders WHERE id = ?", [$orderId]);
            $commercials = Database::queryOne("SELECT * FROM order_commercials WHERE order_id = ?", [$orderId]);

            $unitPrice = (float)($commercials['unit_price'] ?? 10.00);
            $subtotal = $shippedQuantity * $unitPrice;
            $taxPercent = (float)($commercials['tax_percent'] ?? 0.0);
            $taxAmount = ($subtotal * $taxPercent) / 100.0;
            $grandTotal = $subtotal + $taxAmount;

            $invoiceId = Database::generateUuid('inv');
            $invoiceNumber = 'AG-INV-' . date('Y') . '-' . sprintf('%04d', mt_rand(100, 9999));

            // 1. Insert Invoice Master
            Database::execute(
                "INSERT INTO billing_master (id, invoice_number, order_id, customer_id, invoice_date, due_date, subtotal, tax_amount, grand_total, paid_amount, status)
                 VALUES (?, ?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), ?, ?, ?, 0.00, 'Unpaid')",
                [
                    $invoiceId,
                    $invoiceNumber,
                    $orderId,
                    $order['customer_id'],
                    $subtotal,
                    $taxAmount,
                    $grandTotal
                ]
            );

            // 2. Insert Invoice Item
            Database::execute(
                "INSERT INTO billing_items (id, billing_id, description, quantity, unit_price, line_total)
                 VALUES (?, ?, 'Finished Garments Shipped via ' || ?, ?, ?, ?)",
                [
                    Database::generateUuid('bi'),
                    $invoiceId,
                    $shipmentId,
                    $shippedQuantity,
                    $unitPrice,
                    $grandTotal
                ]
            );

            // 3. Double-Entry General Ledger Postings
            // DEBIT: Accounts Receivable (Asset) +$grandTotal
            Database::execute(
                "INSERT INTO transactions (id, entry_type, account_code, amount, reference_type, reference_id, transaction_date)
                 VALUES (?, 'DEBIT', '1200_ACCOUNTS_RECEIVABLE', ?, 'INVOICE', ?, CURRENT_DATE)",
                [Database::generateUuid('tx'), $grandTotal, $invoiceId]
            );

            // CREDIT: Sales Revenue (Income) +$subtotal
            Database::execute(
                "INSERT INTO transactions (id, entry_type, account_code, amount, reference_type, reference_id, transaction_date)
                 VALUES (?, 'CREDIT', '4000_SALES_REVENUE', ?, 'INVOICE', ?, CURRENT_DATE)",
                [Database::generateUuid('tx'), $subtotal, $invoiceId]
            );

            return [
                'invoiceId'     => $invoiceId,
                'invoiceNumber' => $invoiceNumber,
                'grandTotal'    => $grandTotal
            ];
        });
    }

    public static function logPayment(string $orderId, float $amountPaid, string $paymentMethod = 'Bank Wire'): array {
        return Database::transaction(function(PDO $db) use ($orderId, $amountPaid, $paymentMethod) {
            if ($amountPaid <= 0) {
                throw new InvalidArgumentException("Payment amount must be positive.");
            }

            $commercials = Database::queryOne("SELECT * FROM order_commercials WHERE order_id = ?", [$orderId]);
            if (!$commercials) {
                throw new RuntimeException("Commercials not found for order: {$orderId}");
            }

            $newPaid = (float)$commercials['payment_received'] + $amountPaid;
            $newBalance = max(0.0, (float)$commercials['grand_total'] - $newPaid);

            // 1. Update Order Commercials
            Database::execute(
                "UPDATE order_commercials SET payment_received = ?, balance_due = ? WHERE order_id = ?",
                [$newPaid, $newBalance, $orderId]
            );

            // 2. Double-Entry General Ledger Postings
            $txRef = Database::generateUuid('pay');

            // DEBIT: Cash / Bank (Asset) +$amountPaid
            Database::execute(
                "INSERT INTO transactions (id, entry_type, account_code, amount, reference_type, reference_id, transaction_date)
                 VALUES (?, 'DEBIT', '1010_BANK_CHECKING', ?, 'PAYMENT_RECEIPT', ?, CURRENT_DATE)",
                [Database::generateUuid('tx'), $amountPaid, $txRef]
            );

            // CREDIT: Accounts Receivable (Asset Reduction) -$amountPaid
            Database::execute(
                "INSERT INTO transactions (id, entry_type, account_code, amount, reference_type, reference_id, transaction_date)
                 VALUES (?, 'CREDIT', '1200_ACCOUNTS_RECEIVABLE', ?, 'PAYMENT_RECEIPT', ?, CURRENT_DATE)",
                [Database::generateUuid('tx'), $amountPaid, $txRef]
            );

            return [
                'success'         => true,
                'orderId'         => $orderId,
                'amountPaid'      => $amountPaid,
                'totalReceived'   => $newPaid,
                'remainingBalance'=> $newBalance
            ];
        });
    }
}
