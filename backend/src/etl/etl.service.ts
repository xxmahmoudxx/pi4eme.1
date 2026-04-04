import { Injectable, BadRequestException } from '@nestjs/common';

// ── Alias dictionaries: common CSV column names → standard field names ──
// ORDER MATTERS: more specific aliases first to avoid false matches
const PURCHASE_ALIASES: Record<string, string[]> = {
    date: ['date', 'purchase_date', 'purchasedate', 'order_date', 'orderdate', 'dt'],
    supplier: ['supplier', 'vendor', 'fournisseur', 'supplier_name', 'vendorname'],
    item: ['item', 'product', 'product_name', 'productname', 'article', 'item_name'],
    category: ['category', 'cat', 'type', 'group', 'product_category'],
    quantity: ['quantity', 'qty', 'units', 'count', 'qte'],
    unitCost: ['unitcost', 'unit_cost', 'cost_unit', 'unit_price', 'unitprice', 'prix_unitaire', 'prix'],
    totalCost: ['totalcost', 'total_cost', 'cost_total', 'total', 'montant', 'amount', 'cost'],
    status: ['status', 'state'],
    notes: ['notes', 'note', 'comment', 'comments', 'remarks', 'description'],
};

const SALE_ALIASES: Record<string, string[]> = {
    date: ['date', 'sale_date', 'saledate', 'order_date', 'orderdate', 'dt'],
    customer: ['customer', 'client', 'buyer', 'customer_name', 'clientname'],
    product: ['product', 'item', 'product_name', 'productname', 'article', 'item_name'],
    category: ['category', 'cat', 'type', 'group', 'product_category'],
    quantity: ['quantity', 'qty', 'units', 'count', 'qte'],
    unitPrice: ['unitprice', 'unit_price', 'price_unit', 'prix_unitaire', 'prix'],
    totalAmount: ['totalamount', 'total_amount', 'total', 'montant', 'amount', 'revenue', 'price', 'cost'],
    status: ['status', 'state'],
    notes: ['notes', 'note', 'comment', 'comments', 'remarks', 'description'],
};

export interface ColumnMapping {
    [csvColumn: string]: string; // csvColumn → standardField
}

export interface DataQuality {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    qualityPercent: number;
    status: 'good' | 'warning' | 'poor';
    message: string;
}

export interface EtlResult {
    rows: Record<string, any>[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    cleanedRows: number;
    skippedRows: number;
    quality: DataQuality;
    smartFixes: string[];
}

@Injectable()
export class EtlService {

    // ── Parse CSV content into header + rows ────────────────────
    parseCsv(csvContent: string): { headers: string[]; rows: string[][] } {
        // Strip BOM if present
        const content = csvContent.replace(/^\uFEFF/, '');

        // Detect delimiter (comma, semicolon, tab)
        const firstLine = content.split(/\r?\n/)[0] || '';
        const delimiter = this.detectDelimiter(firstLine);

        const lines = content.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 1) throw new BadRequestException('CSV file is empty');

        const headers = this.parseCsvLine(lines[0], delimiter).map((h) => h.trim());
        const rows: string[][] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i], delimiter).map((v) => v.trim());
            if (values.some((v) => v !== '')) {
                rows.push(values);
            }
        }

        return { headers, rows };
    }

    // ── Detect CSV delimiter ────────────────────────────────────
    private detectDelimiter(headerLine: string): string {
        const counts = {
            ',': (headerLine.match(/,/g) || []).length,
            ';': (headerLine.match(/;/g) || []).length,
            '\t': (headerLine.match(/\t/g) || []).length,
        };
        if (counts[';'] > counts[','] && counts[';'] > counts['\t']) return ';';
        if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
        return ',';
    }

    // ── Parse a single CSV line (handles quoted fields) ─────────
    private parseCsvLine(line: string, delimiter: string = ','): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === delimiter) {
                    result.push(current);
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current);
        return result;
    }

    // ── Auto-suggest mapping based on column name similarity ────
    autoSuggestMapping(csvHeaders: string[], type: 'purchase' | 'sale'): ColumnMapping {
        const aliases = type === 'purchase' ? PURCHASE_ALIASES : SALE_ALIASES;
        const mapping: ColumnMapping = {};
        const usedFields = new Set<string>();

        for (const csvHeader of csvHeaders) {
            const normalized = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const [standardField, aliasList] of Object.entries(aliases)) {
                if (usedFields.has(standardField)) continue;
                const match = aliasList.some((alias) => {
                    const normalizedAlias = alias.replace(/[^a-z0-9]/g, '');
                    return normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
                });
                if (match) {
                    mapping[csvHeader] = standardField;
                    usedFields.add(standardField);
                    break;
                }
            }
        }

        return mapping;
    }

    // ── Get required + optional field info for UI ────────────────
    getFieldRequirements(type: 'purchase' | 'sale') {
        if (type === 'sale') {
            return {
                required: [
                    { field: 'product', label: 'Product Name' },
                    { field: 'quantity', label: 'Quantity' },
                    { field: 'date', label: 'Date' },
                ],
                eitherOr: [
                    { fields: ['totalAmount', 'unitPrice'], label: 'Total Amount OR Unit Price (at least one)' },
                ],
                optional: [
                    { field: 'customer', label: 'Customer', default: 'Unknown' },
                    { field: 'category', label: 'Category', default: 'empty' },
                    { field: 'status', label: 'Status', default: 'confirmed' },
                    { field: 'notes', label: 'Notes', default: 'empty' },
                ],
            };
        }
        return {
            required: [
                { field: 'item', label: 'Item/Product Name' },
                { field: 'quantity', label: 'Quantity' },
                { field: 'date', label: 'Date' },
            ],
            eitherOr: [
                { fields: ['totalCost', 'unitCost'], label: 'Total Cost OR Unit Cost (at least one)' },
            ],
            optional: [
                { field: 'supplier', label: 'Supplier', default: 'Unknown' },
                { field: 'category', label: 'Category', default: 'empty' },
                { field: 'status', label: 'Status', default: 'received' },
                { field: 'notes', label: 'Notes', default: 'empty' },
            ],
        };
    }

    // ── Detect smart hints for the user ─────────────────────────
    detectSmartHints(mapping: ColumnMapping, csvHeaders: string[], type: 'purchase' | 'sale'): string[] {
        const hints: string[] = [];
        const mappedFields = new Set(Object.values(mapping));
        const unmappedHeaders = csvHeaders.filter(h => !mapping[h]);

        if (type === 'sale') {
            if (mappedFields.has('totalAmount') && !mappedFields.has('unitPrice')) {
                hints.push('✅ We detected totalAmount — unitPrice will be computed automatically.');
            }
            if (mappedFields.has('unitPrice') && !mappedFields.has('totalAmount')) {
                hints.push('✅ We detected unitPrice — totalAmount will be computed automatically.');
            }
            if (!mappedFields.has('customer')) {
                hints.push('ℹ️ No customer column detected — will default to "Unknown".');
            }
        } else {
            if (mappedFields.has('totalCost') && !mappedFields.has('unitCost')) {
                hints.push('✅ We detected totalCost — unitCost will be computed automatically.');
            }
            if (mappedFields.has('unitCost') && !mappedFields.has('totalCost')) {
                hints.push('✅ We detected unitCost — totalCost will be computed automatically.');
            }
            if (!mappedFields.has('supplier')) {
                hints.push('ℹ️ No supplier column detected — will default to "Unknown".');
            }
        }

        if (unmappedHeaders.length > 0) {
            hints.push(`ℹ️ Extra columns will be ignored: ${unmappedHeaders.join(', ')}`);
        }

        return hints;
    }

    // ══════════════════════════════════════════════════════════════
    //  TRANSFORM + CLEAN — PURCHASES
    // ══════════════════════════════════════════════════════════════
    transformPurchases(headers: string[], rows: string[][], mapping: ColumnMapping): EtlResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const smartFixes: string[] = [];
        const cleanedRows: Record<string, any>[] = [];
        const seen = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const rowNum = i + 2; // +2 because row 1 is header
            const values = rows[i];

            // Build mapped row
            const row: Record<string, any> = {};
            for (const [csvCol, standardField] of Object.entries(mapping)) {
                const colIdx = headers.indexOf(csvCol);
                if (colIdx >= 0 && colIdx < values.length) {
                    row[standardField] = values[colIdx];
                }
            }

            // Clean & validate
            const cleaned = this.cleanPurchaseRow(row, rowNum, errors, warnings, smartFixes);
            if (!cleaned) continue;

            // Duplicate detection (same date + item + quantity)
            const key = `${cleaned.date}|${cleaned.item}|${cleaned.quantity}`;
            if (seen.has(key)) {
                warnings.push(`Row ${rowNum}: duplicate entry skipped`);
                continue;
            }
            seen.add(key);

            cleanedRows.push(cleaned);
        }

        const quality = this.computeQuality(rows.length, cleanedRows.length);

        return {
            rows: cleanedRows,
            errors,
            warnings,
            totalRows: rows.length,
            cleanedRows: cleanedRows.length,
            skippedRows: rows.length - cleanedRows.length,
            quality,
            smartFixes,
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  TRANSFORM + CLEAN — SALES
    // ══════════════════════════════════════════════════════════════
    transformSales(headers: string[], rows: string[][], mapping: ColumnMapping): EtlResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const smartFixes: string[] = [];
        const cleanedRows: Record<string, any>[] = [];
        const seen = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const rowNum = i + 2;
            const values = rows[i];

            const row: Record<string, any> = {};
            for (const [csvCol, standardField] of Object.entries(mapping)) {
                const colIdx = headers.indexOf(csvCol);
                if (colIdx >= 0 && colIdx < values.length) {
                    row[standardField] = values[colIdx];
                }
            }

            const cleaned = this.cleanSaleRow(row, rowNum, errors, warnings, smartFixes);
            if (!cleaned) continue;

            const key = `${cleaned.date}|${cleaned.product}|${cleaned.quantity}`;
            if (seen.has(key)) {
                warnings.push(`Row ${rowNum}: duplicate entry skipped`);
                continue;
            }
            seen.add(key);

            cleanedRows.push(cleaned);
        }

        const quality = this.computeQuality(rows.length, cleanedRows.length);

        return {
            rows: cleanedRows,
            errors,
            warnings,
            totalRows: rows.length,
            cleanedRows: cleanedRows.length,
            skippedRows: rows.length - cleanedRows.length,
            quality,
            smartFixes,
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  CLEAN SINGLE PURCHASE ROW — with smart fallbacks
    // ══════════════════════════════════════════════════════════════
    private cleanPurchaseRow(
        row: Record<string, any>,
        rowNum: number,
        errors: string[],
        warnings: string[],
        smartFixes: string[],
    ): Record<string, any> | null {

        // ── Required fields ──
        const date = this.cleanDate(row.date);
        const item = this.cleanString(row.item);
        const quantity = this.cleanNumber(row.quantity);

        if (!date) { errors.push(`Row ${rowNum}: invalid or missing date "${row.date}"`); return null; }
        if (!item) { errors.push(`Row ${rowNum}: missing item/product name`); return null; }
        if (quantity === null || quantity < 0) { errors.push(`Row ${rowNum}: invalid quantity "${row.quantity}"`); return null; }

        // ── Smart cost resolution: need at least one of (unitCost, totalCost) ──
        let unitCost = this.cleanNumber(row.unitCost);
        let totalCost = this.cleanNumber(row.totalCost);

        if (unitCost !== null && unitCost >= 0 && (totalCost === null || totalCost < 0)) {
            // Case: unitCost exists, totalCost missing → compute
            totalCost = unitCost * quantity;
            smartFixes.push(`Row ${rowNum}: computed totalCost = unitCost × quantity (${totalCost})`);
        } else if (totalCost !== null && totalCost >= 0 && (unitCost === null || unitCost < 0)) {
            // Case: totalCost exists, unitCost missing → compute
            unitCost = quantity > 0 ? totalCost / quantity : 0;
            smartFixes.push(`Row ${rowNum}: computed unitCost = totalCost ÷ quantity (${unitCost.toFixed(2)})`);
        } else if ((unitCost === null || unitCost < 0) && (totalCost === null || totalCost < 0)) {
            // Case: BOTH missing → skip row
            errors.push(`Row ${rowNum}: missing both unitCost and totalCost — cannot determine price`);
            return null;
        }
        // else: both exist → totalCost = quantity × unitCost (override for consistency)
        if (unitCost !== null && unitCost >= 0 && totalCost !== null && totalCost >= 0) {
            const computed = unitCost * quantity;
            if (Math.abs(computed - totalCost) > 0.01 * totalCost) {
                warnings.push(`Row ${rowNum}: totalCost (${totalCost}) differs from unitCost × quantity (${computed.toFixed(2)}). Using provided totalCost.`);
            }
        }

        // ── Optional fields with defaults ──
        const supplier = this.cleanString(row.supplier) || 'Unknown';
        const category = this.cleanString(row.category) || '';
        const status = this.cleanString(row.status) || 'received';
        const notes = this.cleanString(row.notes) || '';

        return {
            date,
            supplier,
            item,
            category,
            quantity,
            unitCost: unitCost ?? 0,
            totalCost: totalCost!,
            status,
            notes,
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  CLEAN SINGLE SALE ROW — with smart fallbacks
    // ══════════════════════════════════════════════════════════════
    private cleanSaleRow(
        row: Record<string, any>,
        rowNum: number,
        errors: string[],
        warnings: string[],
        smartFixes: string[],
    ): Record<string, any> | null {

        // ── Required fields ──
        const date = this.cleanDate(row.date);
        const product = this.cleanString(row.product);
        const quantity = this.cleanNumber(row.quantity);

        if (!date) { errors.push(`Row ${rowNum}: invalid or missing date "${row.date}"`); return null; }
        if (!product) { errors.push(`Row ${rowNum}: missing product name`); return null; }
        if (quantity === null || quantity < 0) { errors.push(`Row ${rowNum}: invalid quantity "${row.quantity}"`); return null; }

        // ── Smart price resolution: need at least one of (unitPrice, totalAmount) ──
        let unitPrice = this.cleanNumber(row.unitPrice);
        let totalAmount = this.cleanNumber(row.totalAmount);

        if (unitPrice !== null && unitPrice >= 0 && (totalAmount === null || totalAmount < 0)) {
            // Case: unitPrice exists, totalAmount missing → compute
            totalAmount = unitPrice * quantity;
            smartFixes.push(`Row ${rowNum}: computed totalAmount = unitPrice × quantity (${totalAmount})`);
        } else if (totalAmount !== null && totalAmount >= 0 && (unitPrice === null || unitPrice < 0)) {
            // Case: totalAmount exists, unitPrice missing → compute
            unitPrice = quantity > 0 ? totalAmount / quantity : 0;
            smartFixes.push(`Row ${rowNum}: computed unitPrice = totalAmount ÷ quantity (${unitPrice.toFixed(2)})`);
        } else if ((unitPrice === null || unitPrice < 0) && (totalAmount === null || totalAmount < 0)) {
            // Case: BOTH missing → skip row
            errors.push(`Row ${rowNum}: missing both unitPrice and totalAmount — cannot determine price`);
            return null;
        }
        // else: both exist — verify consistency
        if (unitPrice !== null && unitPrice >= 0 && totalAmount !== null && totalAmount >= 0) {
            const computed = unitPrice * quantity;
            if (Math.abs(computed - totalAmount) > 0.01 * totalAmount) {
                warnings.push(`Row ${rowNum}: totalAmount (${totalAmount}) differs from unitPrice × quantity (${computed.toFixed(2)}). Using provided totalAmount.`);
            }
        }

        // ── Optional fields with defaults ──
        const customer = this.cleanString(row.customer) || 'Unknown';
        const category = this.cleanString(row.category) || '';
        const status = this.cleanString(row.status) || 'confirmed';
        const notes = this.cleanString(row.notes) || '';

        return {
            date,
            customer,
            product,
            category,
            quantity,
            unitPrice: unitPrice ?? 0,
            totalAmount: totalAmount!,
            status,
            notes,
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  DATA QUALITY ENGINE
    // ══════════════════════════════════════════════════════════════
    private computeQuality(totalRows: number, validRows: number): DataQuality {
        if (totalRows === 0) {
            return {
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                qualityPercent: 0,
                status: 'poor',
                message: 'No data rows found in CSV.',
            };
        }

        const qualityPercent = Math.round((validRows / totalRows) * 100);
        const invalidRows = totalRows - validRows;

        let status: 'good' | 'warning' | 'poor';
        let message: string;

        if (qualityPercent > 80) {
            status = 'good';
            message = `Excellent! ${validRows} of ${totalRows} rows are valid and ready to import.`;
        } else if (qualityPercent >= 50) {
            status = 'warning';
            message = `${validRows} of ${totalRows} rows are usable. ${invalidRows} rows have issues — check the errors below.`;
        } else {
            status = 'poor';
            message = `Only ${validRows} of ${totalRows} rows are valid (${qualityPercent}%). Please check your CSV format and try again.`;
        }

        return { totalRows, validRows, invalidRows, qualityPercent, status, message };
    }

    // ── Data cleaning helpers ───────────────────────────────────
    private cleanString(val: any): string {
        if (val === null || val === undefined) return '';
        return String(val).trim().replace(/\s+/g, ' ');
    }

    private cleanNumber(val: any): number | null {
        if (val === null || val === undefined || val === '') return null;
        const str = String(val).replace(/[^0-9.\-]/g, ''); // strip currency symbols etc.
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
    }

    private cleanDate(val: any): Date | null {
        if (!val || String(val).trim() === '') return null;
        const str = String(val).trim();
        const date = new Date(str);
        if (!isNaN(date.getTime())) return date;

        // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        const parts = str.split(/[\/\-\.]/);
        if (parts.length === 3) {
            const [a, b, c] = parts.map(Number);
            // If first part > 12, assume DD/MM/YYYY
            if (a > 12) {
                const d = new Date(c, b - 1, a);
                if (!isNaN(d.getTime())) return d;
            }
            // Try MM/DD/YYYY
            const d2 = new Date(c, a - 1, b);
            if (!isNaN(d2.getTime())) return d2;
        }
        return null;
    }
}
