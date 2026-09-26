/**
 * Garment OS — Legacy Data Migration Engine (V1 -> V2)
 * Safely parses legacy JSON columns and populates normalized relational tables.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

function migrateLegacyOrders(db) {
    console.log('Starting V1 -> V2 Data Migration...');

    // Check if legacy orders exist
    const legacyOrders = db.prepare("SELECT * FROM orders WHERE status IS NOT NULL").all();
    console.log(`Found ${legacyOrders.length} orders in database.`);

    let migratedCount = 0;

    for (const ord of legacyOrders) {
        // Check if already normalized in order_items
        const existingItems = db.prepare("SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?").get(ord.id);
        if (existingItems && existingItems.cnt > 0) {
            continue; // Already migrated
        }

        let products = [];
        try {
            products = ord.products ? JSON.parse(ord.products) : [];
        } catch (e) {
            products = [];
        }

        if (!Array.isArray(products) || products.length === 0) {
            products = [{
                style: ord.styleName || ord.product || 'Standard Apparel',
                fabric: ord.fabric || '100% Cotton',
                gsm: 180,
                total: ord.qty || ord.totalQuantity || 100
            }];
        }

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const itemId = `item_${ord.id}_${i + 1}`;
            const totalQty = p.total || p.totalQuantity || ord.qty || 100;

            db.prepare(`
                INSERT OR IGNORE INTO order_items (id, order_id, workflow_preset_id, style_code, style_name, fabric_composition, target_gsm, total_quantity)
                VALUES (?, ?, 'wp_standard_cmt', ?, ?, ?, ?, ?)
            `).run(
                itemId,
                ord.id,
                p.style || `STYLE-${i+1}`,
                p.style || ord.styleName || 'Apparel Item',
                p.fabric || 'Cotton Single Jersey',
                parseInt(p.gsm) || 180,
                parseInt(totalQty) || 100
            );

            // Create variant
            const varId = `var_${itemId}_1`;
            db.prepare(`
                INSERT OR IGNORE INTO order_item_variants (id, order_item_id, color_name, color_code, total_quantity)
                VALUES (?, ?, 'Standard Color', '#000000', ?)
            `).run(varId, itemId, parseInt(totalQty) || 100);

            // Create sizes
            db.prepare(`
                INSERT OR IGNORE INTO order_item_sizes (id, variant_id, size_code, ratio_factor, ordered_quantity)
                VALUES (?, ?, 'M', 1, ?)
            `).run(`siz_${varId}_M`, varId, parseInt(totalQty) || 100);
        }

        // Commercials
        const grandTotal = parseFloat(ord.grandTotal || ord.totalAmount || ord.value || 0.0);
        const paymentRec = parseFloat(ord.paymentReceived || 0.0);
        const balanceDue = Math.max(0.0, grandTotal - paymentRec);

        db.prepare(`
            INSERT OR IGNORE INTO order_commercials (id, order_id, currency, unit_price, subtotal, grand_total, payment_terms, payment_received, balance_due)
            VALUES (?, ?, 'USD', ?, ?, ?, 'Net 30', ?, ?)
        `).run(
            `comm_${ord.id}`,
            ord.id,
            parseFloat(ord.unitPrice || 0.0),
            grandTotal,
            grandTotal,
            paymentRec,
            balanceDue
        );

        migratedCount++;
    }

    console.log(`Successfully migrated ${migratedCount} legacy orders into normalized relational schema.`);
}

module.exports = { migrateLegacyOrders };
