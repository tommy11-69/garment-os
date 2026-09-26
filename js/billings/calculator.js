// js/billings/calculator.js — Canonical Calculation & Financial Resolver Engine for Garment OS

/**
 * Converts a numeric amount into Indian Rupee words.
 * Handles up to Crores with precision.
 * @param {number} num 
 * @returns {string} Words formatted as "Rupees ... Only"
 */
export function numberToIndianRupeesWords(num) {
    if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';
    
    const a = [
        '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
        'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const absNum = Math.abs(num);
    const intPart = Math.floor(absNum);
    const decPart = Math.round((absNum - intPart) * 100);

    function convertGroup(n) {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'Hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else if (n > 0) {
            str += a[n];
        }
        return str;
    }

    const numStr = ('000000000' + intPart).slice(-9);
    const crore = parseInt(numStr.substring(0, 2), 10);
    const lakh = parseInt(numStr.substring(2, 4), 10);
    const thousand = parseInt(numStr.substring(4, 6), 10);
    const hundred = parseInt(numStr.substring(6, 9), 10);

    let output = '';
    if (crore > 0) output += convertGroup(crore) + 'Crore ';
    if (lakh > 0) output += convertGroup(lakh) + 'Lakh ';
    if (thousand > 0) output += convertGroup(thousand) + 'Thousand ';
    if (hundred > 0) output += convertGroup(hundred);

    output = output.trim();
    if (!output) output = 'Zero';

    let result = output + ' Rupees';

    if (decPart > 0) {
        result += ' and ' + convertGroup(decPart).trim() + ' Paise';
    }

    return result + ' Only';
}

/**
 * Format number to INR currency string (e.g., ₹1,25,450.00)
 */
export function fmtCurrency(amount) {
    const val = Number(amount || 0);
    return '₹' + val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format ISO date string into Indian readable format (e.g. 26 Sep 2026)
 */
export function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Canonical calculation engine for Garment OS Invoices, Quotes, and Purchase Bills.
 * @param {Array} items - Array of line item objects
 * @param {Object} options - Configuration options (taxType, sellerState, buyerState, customDiscount, enableRoundOff)
 * @returns {Object} Complete calculated financial model
 */
export function calculateInvoice(items = [], options = {}) {
    const {
        taxType = 'INTRA_STATE', // 'INTRA_STATE' (CGST+SGST) or 'INTER_STATE' (IGST)
        sellerStateCode = '33',  // Default Tamil Nadu
        buyerStateCode = '33',
        customDiscount = 0,
        enableRoundOff = true
    } = options;

    // Determine supply type automatically if state codes differ
    const resolvedTaxType = (buyerStateCode && sellerStateCode && buyerStateCode.toString().trim() !== sellerStateCode.toString().trim())
        ? 'INTER_STATE'
        : taxType;

    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const taxBreakdownMap = {}; // Keyed by tax percentage

    const calculatedItems = (Array.isArray(items) ? items : []).map((item, index) => {
        const qty = Math.max(0, parseFloat(item.quantity) || 0);
        const rate = Math.max(0, parseFloat(item.unit_price) || 0);
        const discPct = Math.min(100, Math.max(0, parseFloat(item.discount_pct) || 0));
        const gstPct = Math.max(0, parseFloat(item.tax_pct) || 0);

        const lineGross = qty * rate;
        const lineDiscount = lineGross * (discPct / 100);
        const lineTaxable = lineGross - lineDiscount;
        const lineTaxAmount = lineTaxable * (gstPct / 100);
        const lineTotal = lineTaxable + lineTaxAmount;

        grossSubtotal += lineGross;
        totalDiscount += lineDiscount;
        totalTax += lineTaxAmount;

        // Group tax breakdown for GST tax table
        const rateKey = gstPct.toFixed(1);
        if (!taxBreakdownMap[rateKey]) {
            taxBreakdownMap[rateKey] = {
                rate: gstPct,
                taxable: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                totalTax: 0
            };
        }
        taxBreakdownMap[rateKey].taxable += lineTaxable;
        if (resolvedTaxType === 'INTER_STATE') {
            taxBreakdownMap[rateKey].igst += lineTaxAmount;
        } else {
            taxBreakdownMap[rateKey].cgst += lineTaxAmount / 2;
            taxBreakdownMap[rateKey].sgst += lineTaxAmount / 2;
        }
        taxBreakdownMap[rateKey].totalTax += lineTaxAmount;

        return {
            ...item,
            sort_order: index + 1,
            item_name: item.item_name || 'Item',
            item_id: item.item_id || '',
            description: item.description || '',
            hsn_code: item.hsn_code || '6109',
            quantity: qty,
            unit: item.unit || 'pcs',
            unit_price: rate,
            discount_pct: discPct,
            tax_pct: gstPct,
            taxable_value: Math.round(lineTaxable * 100) / 100,
            tax_amount: Math.round(lineTaxAmount * 100) / 100,
            row_total: Math.round(lineTotal * 100) / 100
        };
    });

    const additionalDiscount = Math.max(0, parseFloat(customDiscount) || 0);
    const finalTotalDiscount = totalDiscount + additionalDiscount;
    const netTaxable = Math.max(0, grossSubtotal - finalTotalDiscount);
    const rawGrandTotal = netTaxable + totalTax;
    
    const roundedGrandTotal = enableRoundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
    const roundOffDiff = roundedGrandTotal - rawGrandTotal;

    const taxBreakdown = Object.values(taxBreakdownMap).map(b => ({
        rate: b.rate,
        taxable: Math.round(b.taxable * 100) / 100,
        cgst: Math.round(b.cgst * 100) / 100,
        sgst: Math.round(b.sgst * 100) / 100,
        igst: Math.round(b.igst * 100) / 100,
        totalTax: Math.round(b.totalTax * 100) / 100
    }));

    return {
        items: calculatedItems,
        taxType: resolvedTaxType,
        grossSubtotal: Math.round(grossSubtotal * 100) / 100,
        totalDiscount: Math.round(finalTotalDiscount * 100) / 100,
        netTaxable: Math.round(netTaxable * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        cgstTotal: resolvedTaxType === 'INTRA_STATE' ? Math.round((totalTax / 2) * 100) / 100 : 0,
        sgstTotal: resolvedTaxType === 'INTRA_STATE' ? Math.round((totalTax / 2) * 100) / 100 : 0,
        igstTotal: resolvedTaxType === 'INTER_STATE' ? Math.round(totalTax * 100) / 100 : 0,
        roundOff: Math.round(roundOffDiff * 100) / 100,
        grandTotal: roundedGrandTotal,
        amountInWords: numberToIndianRupeesWords(roundedGrandTotal),
        taxBreakdown
    };
}
