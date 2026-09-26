// js/billings/document-renderer.js — Canonical Document & Print Renderer for Garment OS
import { calculateInvoice, fmtCurrency, fmtDate } from './calculator.js';

// Default Factory / Tenant Profile
export const DEFAULT_COMPANY_PROFILE = {
    legalName: 'Udhayaa Textiles',
    tradeName: 'Udhayaa Textiles',
    tagline: 'Crafting Your Identity In Every Thread',
    addressLine1: '13/3 B.S.S Street, 3rd Street',
    addressLine2: 'Palayakadu, Tirupur',
    city: 'Tirupur',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '641601',
    phone: '+91 77083 33813',
    email: 'info@udhayaatextiles.com',
    gstin: '33ANGPU7147M1ZE',
    bankName: 'Indian Overseas Bank',
    branch: 'Erode Periasemur',
    accountName: 'Udhayaa Textiles',
    accountNumber: '134601000036234',
    ifsc: 'IOBA0001346',
    upiId: 'info.udhayaatextiles-2@okhdfcbank',
    terms: [
        'Payment: 50% advance to confirm order; 20% on dyeing; 30% prior to dispatch.',
        'Goods once sold will not be taken back or exchanged without prior approval.',
        'Disputes if any are subject to Erode jurisdiction only.',
        'All rates valid for 7 days from document generation date.'
    ]
};

// SVG Company Logo
const COMPANY_LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="invoice-logo">
  <rect width="48" height="48" rx="10" fill="#0071E3"/>
  <path d="M14 16C14 14.8954 14.8954 14 16 14H32C33.1046 14 34 14.8954 34 16V22C34 27.5228 29.5228 32 24 32C18.4772 32 14 27.5228 14 22V16Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M24 32V36M18 36H30" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="24" cy="22" r="3" fill="#FF6B00"/>
</svg>
`;

/**
 * Maps document type to formal title and badges
 */
export function getDocumentTitle(transactionType) {
    const titles = {
        Quotation: 'PROFORMA INVOICE / QUOTATION',
        Sales_Bill: 'TAX INVOICE',
        Payment_In: 'PAYMENT RECEIPT',
        Purchase_Bill: 'PURCHASE BILL',
        Purchase_Order: 'PURCHASE ORDER',
        Payment_Out: 'PAYMENT VOUCHER'
    };
    return titles[transactionType] || 'COMMERCIAL DOCUMENT';
}

/**
 * Generates the inner .invoice-page DOM markup for in-app preview or print.
 */
export function renderInvoicePageMarkup(doc = {}, contactInfo = {}, company = DEFAULT_COMPANY_PROFILE) {
    const isPayment = doc.transaction_type === 'Payment_In' || doc.transaction_type === 'Payment_Out';
    const docTitle = getDocumentTitle(doc.transaction_type);

    // Compute financial data model using canonical calculator
    const buyerStateCode = contactInfo.stateCode || (contactInfo.gstin ? contactInfo.gstin.substring(0, 2) : '33');
    const calc = calculateInvoice(doc.items || [], {
        taxType: doc.tax_type || (buyerStateCode !== company.stateCode ? 'INTER_STATE' : 'INTRA_STATE'),
        sellerStateCode: company.stateCode,
        buyerStateCode: buyerStateCode,
        customDiscount: doc.discount || 0,
        enableRoundOff: true
    });

    const grandTotal = isPayment ? (Number(doc.grand_total) || 0) : calc.grandTotal;
    const amountWords = isPayment ? calc.amountInWords : calc.amountInWords;
    const gstin = contactInfo.gstin || doc.contact_gstin || '';
    const contactDisplayName = contactInfo.company 
        ? `${contactInfo.name || doc.contact_name} <span style="font-weight:normal;color:#475569">(${contactInfo.company})</span>`
        : (contactInfo.name || doc.contact_name || 'Cash / Counter Client');

    // Build Table Rows
    const itemsRowsHTML = calc.items.map((item, i) => `
        <tr>
            <td style="text-align:center;color:#64748b;font-weight:600;width:30px;">${i + 1}</td>
            <td style="font-weight:600;color:#0f172a">
                ${item.item_name}
                ${item.description ? `<div style="color:#64748b;font-size:9px;font-weight:normal;margin-top:2px">${item.description}</div>` : ''}
            </td>
            <td style="text-align:center;color:#475569;font-family:monospace;font-size:9.5px;width:60px;">${item.hsn_code || '6109'}</td>
            <td style="text-align:center;font-weight:600;width:70px;">${item.quantity} <span style="font-size:9px;color:#64748b">${item.unit || 'pcs'}</span></td>
            <td style="text-align:right;width:80px;">${fmtCurrency(item.unit_price)}</td>
            <td style="text-align:center;color:#64748b;width:55px;">${item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
            <td style="text-align:right;color:#475569;width:85px;">${fmtCurrency(item.tax_amount)} <span style="font-size:8.5px;color:#64748b">(${item.tax_pct}%)</span></td>
            <td style="text-align:right;font-weight:700;color:#0f172a;width:95px;">${fmtCurrency(item.row_total)}</td>
        </tr>
    `).join('');

    return `
    <div class="invoice-page">
        <div>
            <!-- Header with Company Profile & Contact Meta -->
            <div class="invoice-header">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
                    <div class="invoice-brand">
                        ${COMPANY_LOGO_SVG}
                        <div>
                            <div class="invoice-company-name">
                                <span style="color:#0071E3;">Udhayaa </span><span style="color:#FF6B00;">Textiles</span>
                            </div>
                            <div class="invoice-company-tagline">${company.tagline}</div>
                        </div>
                    </div>
                    <div class="invoice-company-meta">
                        <div style="font-weight:700;color:#0f172a">${company.addressLine1}</div>
                        <div>${company.addressLine2} - ${company.pincode}</div>
                        <div>Phone: <strong>${company.phone}</strong> · ${company.email}</div>
                        <div>
                            <span class="invoice-badge-gst">GSTIN: ${company.gstin}</span>
                            <span style="display:inline-block;margin-left:4px;font-size:9.5px;color:#475569;font-weight:600">State: ${company.stateCode}-${company.state}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Document Ribbon -->
            <div class="invoice-ribbon">
                <div class="invoice-title">${docTitle}</div>
                <div class="invoice-meta-item"><strong>Doc #:</strong> <span style="font-family:monospace;font-weight:700;">${doc.invoice_number || 'N/A'}</span></div>
                <div class="invoice-meta-item"><strong>Date:</strong> ${fmtDate(doc.date)}</div>
                ${doc.due_date ? `<div class="invoice-meta-item"><strong>Due Date:</strong> ${fmtDate(doc.due_date)}</div>` : ''}
                <div class="invoice-meta-item"><strong>Place of Supply:</strong> ${doc.place_of_supply || '33-Tamil Nadu'}</div>
            </div>

            <!-- 2-Column Info Cards -->
            <div class="invoice-info-grid">
                <div class="invoice-card">
                    <div class="invoice-card-label">${doc.transaction_type === 'Purchase_Bill' || doc.transaction_type === 'Purchase_Order' ? 'Vendor Details' : (isPayment ? 'Party Details' : 'Bill To (Buyer)')}</div>
                    <div class="invoice-card-name">${contactDisplayName}</div>
                    ${gstin ? `<div style="font-weight:700;color:#0f172a;margin-top:2px;">GSTIN: <span style="font-family:monospace;letter-spacing:0.3px;">${gstin}</span></div>` : ''}
                    ${contactInfo.address ? `<div style="color:#334155;margin-top:2px;">${contactInfo.address}</div>` : ''}
                    ${contactInfo.phone ? `<div style="color:#334155;margin-top:2px;">Phone: <strong>${contactInfo.phone}</strong></div>` : ''}
                    ${contactInfo.email ? `<div style="color:#475569;">Email: ${contactInfo.email}</div>` : ''}
                </div>
                <div class="invoice-card">
                    <div class="invoice-card-label">Bank &amp; Remittance Details</div>
                    <div style="font-weight:700;color:#0f172a;">${company.bankName}</div>
                    <div style="color:#475569;">Branch: ${company.branch} | A/C Name: ${company.accountName}</div>
                    <div style="font-weight:700;color:#0f172a;margin-top:2px;">A/C No: <span style="font-family:monospace;letter-spacing:0.5px;">${company.accountNumber}</span></div>
                    <div style="font-weight:700;color:#0f172a;">IFSC: <span style="font-family:monospace;letter-spacing:0.5px;">${company.ifsc}</span></div>
                    <div style="font-weight:600;color:#0071E3;margin-top:1px;">UPI ID: ${company.upiId}</div>
                </div>
            </div>

            ${isPayment ? `
            <!-- Payment Document Block -->
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:8px;">
                    <div>
                        <div style="font-size:9.5px; text-transform:uppercase; color:#64748b; font-weight:700;">Voucher Type</div>
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">${doc.transaction_type === 'Payment_In' ? 'Payment Received' : 'Payment Disbursed'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:9.5px; text-transform:uppercase; color:#64748b; font-weight:700;">Voucher Amount</div>
                        <div style="font-size:20px; font-weight:800; color:${doc.transaction_type === 'Payment_In' ? '#008A00' : '#dc2626'};">${fmtCurrency(grandTotal)}</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Amount in Words</div>
                        <div style="font-weight:600; color:#1e293b; margin-top:2px;">${amountWords}</div>
                    </div>
                    <div>
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Linked Document / Ref</div>
                        <div style="font-weight:600; color:#1e293b; margin-top:2px;">${doc.linked_bill_id || 'Direct Payment Voucher'}</div>
                    </div>
                    ${doc.notes ? `
                    <div style="grid-column: span 2; border-top:1px dashed #cbd5e1; padding-top:6px;">
                        <div style="font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700;">Notes &amp; Particulars</div>
                        <div style="font-weight:500; color:#334155; margin-top:2px;">${doc.notes}</div>
                    </div>` : ''}
                </div>
            </div>
            ` : `
            <!-- Line Items Table -->
            <div class="invoice-table-wrapper">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width:30px;text-align:center">#</th>
                            <th>Description</th>
                            <th style="width:60px;text-align:center">HSN/SAC</th>
                            <th style="width:70px;text-align:center">Qty</th>
                            <th style="width:80px;text-align:right">Rate</th>
                            <th style="width:55px;text-align:center">Disc %</th>
                            <th style="width:85px;text-align:right">Tax</th>
                            <th style="width:95px;text-align:right">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRowsHTML}</tbody>
                </table>
            </div>

            <!-- Summary, Tax Breakdown & Totals -->
            <div class="invoice-summary-grid">
                <div class="invoice-words-box">
                    <div style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:2px">Amount in Words:</div>
                    <div style="font-weight:700;color:#0f172a;font-style:italic;">${amountWords}</div>
                    <div style="font-size:9px;color:#475569;margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:4px">
                        <strong>Tax Summary:</strong> 
                        ${calc.taxType === 'INTER_STATE'
                            ? `IGST Total: ${fmtCurrency(calc.igstTotal)}`
                            : `CGST: ${fmtCurrency(calc.cgstTotal)} | SGST: ${fmtCurrency(calc.sgstTotal)} | Total Tax: ${fmtCurrency(calc.totalTax)}`
                        }
                    </div>
                </div>
                <div class="invoice-totals-card">
                    <div class="invoice-totals-row"><span>Gross Subtotal:</span><span style="font-weight:600">${fmtCurrency(calc.grossSubtotal)}</span></div>
                    ${calc.totalDiscount > 0 ? `<div class="invoice-totals-row"><span>Discount:</span><span style="color:#dc2626">−${fmtCurrency(calc.totalDiscount)}</span></div>` : ''}
                    <div class="invoice-totals-row"><span>Taxable Value:</span><span style="font-weight:600">${fmtCurrency(calc.netTaxable)}</span></div>
                    ${calc.taxType === 'INTER_STATE' ? `
                    <div class="invoice-totals-row"><span>IGST:</span><span>${fmtCurrency(calc.igstTotal)}</span></div>
                    ` : `
                    <div class="invoice-totals-row"><span>CGST:</span><span>${fmtCurrency(calc.cgstTotal)}</span></div>
                    <div class="invoice-totals-row"><span>SGST:</span><span>${fmtCurrency(calc.sgstTotal)}</span></div>
                    `}
                    ${Math.abs(calc.roundOff) > 0.001 ? `<div class="invoice-totals-row"><span>Round Off:</span><span>${calc.roundOff > 0 ? '+' : ''}${calc.roundOff.toFixed(2)}</span></div>` : ''}
                    <div class="invoice-totals-row grand"><span>Grand Total:</span><span>${fmtCurrency(calc.grandTotal)}</span></div>
                </div>
            </div>
            `}
        </div>

        <!-- Terms & Conditions + Authorized Signatory Footer -->
        <div class="invoice-footer-section">
            <div class="invoice-terms-box">
                <h4>Terms &amp; Conditions</h4>
                <ul>
                    ${company.terms.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
            <div class="invoice-sign-card">
                <div class="invoice-sign-line"></div>
                <div style="font-size:10px;font-weight:700;color:#0f172a">For ${company.legalName.toUpperCase()}</div>
                <div style="font-size:8.5px;color:#64748b">Authorized Signatory</div>
            </div>
        </div>
    </div>
    `;
}

/**
 * Returns full HTML document string for popup print window.
 */
export function renderPrintableHTMLDocument(doc, contactInfo = {}, company = DEFAULT_COMPANY_PROFILE) {
    const docTitle = getDocumentTitle(doc.transaction_type);
    const pageMarkup = renderInvoicePageMarkup(doc, contactInfo, company);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${docTitle} — ${doc.invoice_number || 'DOCUMENT'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/invoice-document.css?v=6.0">
    <style>
        .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 50;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .toolbar-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            border: none;
            transition: all 0.15s ease;
        }
        .btn-primary { background: #0071E3; color: #ffffff; }
        .btn-primary:hover { background: #005bb5; }
        .btn-secondary { background: #334155; color: #f1f5f9; }
        .btn-secondary:hover { background: #475569; }
    </style>
</head>
<body>
    <div class="print-toolbar no-print">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;font-size:13px;">Garment OS Document Viewer</span>
            <span style="background:#334155;color:#94a3b8;font-size:11px;padding:2px 6px;border-radius:4px;font-family:monospace;">${doc.invoice_number || 'DOC'}</span>
        </div>
        <div style="display:flex;gap:8px;">
            <button type="button" onclick="window.print()" class="toolbar-btn btn-primary">
                🖨️ Print / Save PDF
            </button>
            <button type="button" onclick="window.close()" class="toolbar-btn btn-secondary">
                ✕ Close
            </button>
        </div>
    </div>

    <div class="invoice-viewport">
        ${pageMarkup}
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;
}
