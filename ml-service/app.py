"""
Tenexa ML Service — Flask microservice for AI/ML features.
Receives purchase + sales data from the NestJS backend via HTTP POST,
runs ML computations, and returns results as JSON.

Endpoints:
  POST /ml/stockout         → Stockout risk prediction + reorder recommendation
  POST /ml/health-score     → Company financial health score (0-100)
  POST /ml/forecast         → Revenue forecast (linear regression)
  POST /ml/product-performance → Product classification
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import re
import os
import sys
import traceback
import tempfile
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

# ── Tesseract path configuration (Windows) ────────────────────────────
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"D:\imagepiworker\tesseract.exe"

app = Flask(__name__)
CORS(app)


# ════════════════════════════════════════════════════════════════
# FEATURE 1 & 2: STOCKOUT RISK + REORDER RECOMMENDATION
# ════════════════════════════════════════════════════════════════

@app.route('/ml/stockout', methods=['POST'])
def stockout_prediction():
    """
    Input: { purchases: [...], sales: [...] }
    
    Algorithm:
    1. Match products between purchases (supply) and sales (demand) by name
    2. For each product:
       - total_purchased = sum of quantities from purchases
       - total_sold = sum of quantities from sales
       - estimated_stock = total_purchased - total_sold
       - daily_sales_velocity = total_sold / days_in_sales_span
       - days_until_stockout = estimated_stock / daily_sales_velocity
    3. Risk classification: High (<7 days), Medium (7-21), Low (>21)
    4. Reorder qty = ceil(daily_velocity * 30 * 1.25) (30-day supply + 25% safety stock)
    """
    data = request.get_json()
    purchases = data.get('purchases', [])
    sales = data.get('sales', [])

    if not sales:
        return jsonify([])

    # Parse dates
    def parse_date(d):
        if isinstance(d, str):
            return datetime.fromisoformat(d.replace('Z', '+00:00').split('T')[0])
        return datetime.now()

    # Aggregate purchased quantities by product/item name
    purchased_qty = {}
    for p in purchases:
        name = (p.get('item') or '').strip().lower()
        if name:
            purchased_qty[name] = purchased_qty.get(name, 0) + (p.get('quantity') or 0)

    # Aggregate sold quantities and dates by product name
    sold_data = {}
    for s in sales:
        name = (s.get('product') or '').strip().lower()
        if name:
            if name not in sold_data:
                sold_data[name] = {'qty': 0, 'dates': [], 'display_name': s.get('product', '')}
            sold_data[name]['qty'] += (s.get('quantity') or 0)
            sold_data[name]['dates'].append(parse_date(s.get('date')))

    results = []
    for product_key, sdata in sold_data.items():
        total_purchased = purchased_qty.get(product_key, 0)
        total_sold = sdata['qty']
        estimated_stock = max(total_purchased - total_sold, 0)

        # Calculate sales velocity (units per day)
        dates = sdata['dates']
        if len(dates) >= 2:
            date_span = (max(dates) - min(dates)).days
            days_span = max(date_span, 1)
        else:
            days_span = 30  # default assumption

        daily_velocity = total_sold / days_span if days_span > 0 else 0

        # Days until stockout
        if daily_velocity > 0:
            days_until_stockout = estimated_stock / daily_velocity
        else:
            days_until_stockout = 999  # no sales velocity → no stockout risk

        # Risk classification
        if days_until_stockout < 7:
            risk = 'HIGH'
        elif days_until_stockout < 21:
            risk = 'MEDIUM'
        else:
            risk = 'LOW'

        # Reorder recommendation (30-day supply + 25% safety stock)
        reorder_qty = 0
        urgency = 'None'
        explanation = ''
        if risk in ('HIGH', 'MEDIUM'):
            reorder_qty = int(np.ceil(daily_velocity * 30 * 1.25))
            if risk == 'HIGH':
                urgency = 'URGENT'
                explanation = f"Stock critically low. At current sales rate of {daily_velocity:.1f} units/day, stock will run out in ~{int(days_until_stockout)} days. Order {reorder_qty} units immediately."
            else:
                urgency = 'SOON'
                explanation = f"Stock getting low. At current sales rate of {daily_velocity:.1f} units/day, consider ordering {reorder_qty} units within the next week."

        results.append({
            'product': sdata['display_name'],
            'estimatedStock': int(estimated_stock),
            'totalPurchased': int(total_purchased),
            'totalSold': int(total_sold),
            'dailySalesVelocity': round(daily_velocity, 2),
            'daysUntilStockout': round(min(days_until_stockout, 999), 1),
            'risk': risk,
            'reorderQty': reorder_qty,
            'urgency': urgency,
            'explanation': explanation,
        })

    # Sort by risk severity
    risk_order = {'High': 0, 'Medium': 1, 'Low': 2}
    results.sort(key=lambda x: (risk_order.get(x['risk'], 3), x['daysUntilStockout']))

    return jsonify(results)


# ════════════════════════════════════════════════════════════════
# FEATURE 3: COMPANY HEALTH SCORE (0-100)
# ════════════════════════════════════════════════════════════════

@app.route('/ml/health-score', methods=['POST'])
def health_score():
    """
    Weighted scoring model:
      - Profit Margin (25%): (revenue - costs) / revenue
      - Revenue Trend (20%): 2nd half vs 1st half revenue growth
      - Cost Efficiency (15%): 1 - (costs / revenue) ratio
      - Sales Consistency (15%): inverse of coefficient of variation
      - Inventory Risk (15%): % of products with Low risk
      - Growth Rate (10%): month-over-month growth
    """
    data = request.get_json()
    purchases = data.get('purchases', [])
    sales = data.get('sales', [])

    if not sales:
        return jsonify({
            'score': 0,
            'status': 'No Data',
            'explanation': 'Upload sales and purchase data to generate your company health score.',
            'factors': []
        })

    def parse_date(d):
        if isinstance(d, str):
            return datetime.fromisoformat(d.replace('Z', '+00:00').split('T')[0])
        return datetime.now()

    # Basic aggregates
    total_revenue = sum(s.get('totalAmount', 0) for s in sales)
    total_costs = sum(p.get('totalCost', 0) for p in purchases)
    profit = total_revenue - total_costs

    factors = []

    # 1. Profit Margin Score (25%)
    if total_revenue > 0:
        margin = profit / total_revenue
        margin_score = min(max(margin * 100, 0), 100)
    else:
        margin_score = 0
    factors.append({
        'name': 'PROFIT_MARGIN',
        'score': round(margin_score, 1),
        'weight': 25,
        'detail': f"{'Profit' if profit >= 0 else 'Loss'}: {profit:.2f} ({margin_score:.0f}% margin)"
    })

    # 2. Revenue Trend Score (20%)
    sale_dates = [(parse_date(s.get('date')), s.get('totalAmount', 0)) for s in sales]
    sale_dates.sort(key=lambda x: x[0])
    mid = len(sale_dates) // 2
    if mid > 0:
        first_half_rev = sum(x[1] for x in sale_dates[:mid])
        second_half_rev = sum(x[1] for x in sale_dates[mid:])
        if first_half_rev > 0:
            trend_growth = (second_half_rev - first_half_rev) / first_half_rev
            trend_score = min(max(50 + trend_growth * 50, 0), 100)
        else:
            trend_score = 50
    else:
        trend_score = 50
    trend_dir = 'INCREASING' if trend_score > 55 else ('DECREASING' if trend_score < 45 else 'STABLE')
    factors.append({
        'name': 'REVENUE_TREND',
        'score': round(trend_score, 1),
        'weight': 20,
        'detail': f"Revenue trend: {trend_dir}"
    })

    # 3. Cost Efficiency Score (15%)
    if total_revenue > 0:
        cost_ratio = total_costs / total_revenue
        efficiency_score = min(max((1 - cost_ratio) * 100, 0), 100)
    else:
        efficiency_score = 0
    factors.append({
        'name': 'COST_EFFICIENCY',
        'score': round(efficiency_score, 1),
        'weight': 15,
        'detail': f"Cost-to-revenue ratio: {cost_ratio:.1%}" if total_revenue > 0 else "No revenue data"
    })

    # 4. Sales Consistency Score (15%)
    daily_revenues = {}
    for s in sales:
        d = parse_date(s.get('date')).strftime('%Y-%m-%d')
        daily_revenues[d] = daily_revenues.get(d, 0) + s.get('totalAmount', 0)
    rev_values = list(daily_revenues.values())
    if len(rev_values) >= 2:
        mean_rev = np.mean(rev_values)
        std_rev = np.std(rev_values)
        cv = std_rev / mean_rev if mean_rev > 0 else 0
        consistency_score = min(max((1 - cv) * 100, 0), 100)
    else:
        consistency_score = 50
    factors.append({
        'name': 'SALES_CONSISTENCY',
        'score': round(consistency_score, 1),
        'weight': 15,
        'detail': f"Sales volatility: {'LOW' if consistency_score > 60 else 'HIGH'}"
    })

    # 5. Inventory Risk Score (15%)
    sold_products = set((s.get('product') or '').strip().lower() for s in sales)
    purchased_products = set((p.get('item') or '').strip().lower() for p in purchases)
    covered = len(sold_products & purchased_products)
    total_products = len(sold_products)
    inventory_score = (covered / total_products * 100) if total_products > 0 else 50
    factors.append({
        'name': 'INVENTORY_COVERAGE',
        'score': round(inventory_score, 1),
        'weight': 15,
        'detail': f"{covered}/{total_products} sold products have purchase supply"
    })

    # 6. Growth Rate Score (10%)
    monthly_rev = {}
    for s in sales:
        m = parse_date(s.get('date')).strftime('%Y-%m')
        monthly_rev[m] = monthly_rev.get(m, 0) + s.get('totalAmount', 0)
    months = sorted(monthly_rev.keys())
    if len(months) >= 2:
        last = monthly_rev[months[-1]]
        prev = monthly_rev[months[-2]]
        if prev > 0:
            growth = (last - prev) / prev
            growth_score = min(max(50 + growth * 50, 0), 100)
        else:
            growth_score = 50
    else:
        growth_score = 50
    factors.append({
        'name': 'GROWTH_RATE',
        'score': round(growth_score, 1),
        'weight': 10,
        'detail': f"Month-over-month growth: {'POSITIVE' if growth_score > 55 else ('NEGATIVE' if growth_score < 45 else 'FLAT')}"
    })

    # Weighted total
    total_score = sum(f['score'] * f['weight'] / 100 for f in factors)
    total_score = min(max(round(total_score, 1), 0), 100)

    if total_score >= 70:
        status = 'HEALTHY'
        explanation = 'Your company shows strong financial health with good margins and consistent sales.'
    elif total_score >= 40:
        status = 'WARNING'
        weak = min(factors, key=lambda f: f['score'])
        explanation = f"Some areas need attention. Weakest factor: {weak['name']} ({weak['score']:.0f}/100)."
    else:
        status = 'CRITICAL'
        weak = min(factors, key=lambda f: f['score'])
        explanation = f"Financial health is concerning. Focus on improving {weak['name']} immediately."

    return jsonify({
        'score': total_score,
        'status': status,
        'explanation': explanation,
        'factors': factors,
        'revenue': round(total_revenue, 2),
        'costs': round(total_costs, 2),
        'profit': round(profit, 2),
    })


# ════════════════════════════════════════════════════════════════
# FEATURE 4: SALES FORECAST (LINEAR REGRESSION)
# ════════════════════════════════════════════════════════════════

@app.route('/ml/forecast', methods=['POST'])
def sales_forecast():
    """
    Uses scikit-learn LinearRegression on daily revenue time series.
    Predicts next 7 days of revenue.
    Returns both actual + forecast data points for chart rendering.
    """
    data = request.get_json()
    sales = data.get('sales', [])

    if not sales:
        return jsonify({
            'actual': [],
            'forecast': [],
            'trend': 'NO_DATA',
            'nextWeekTotal': 0,
            'confidence': 0,
        })

    def parse_date(d):
        if isinstance(d, str):
            return datetime.fromisoformat(d.replace('Z', '+00:00').split('T')[0])
        return datetime.now()

    # Aggregate daily revenue
    daily = {}
    for s in sales:
        d = parse_date(s.get('date')).strftime('%Y-%m-%d')
        daily[d] = daily.get(d, 0) + s.get('totalAmount', 0)

    if len(daily) < 3:
        return jsonify({
            'actual': [{'date': k, 'revenue': v} for k, v in sorted(daily.items())],
            'forecast': [],
            'trend': 'INSUFFICIENT_DATA',
            'nextWeekTotal': 0,
            'confidence': 0,
        })

    # Sort by date
    sorted_dates = sorted(daily.keys())
    revenues = [daily[d] for d in sorted_dates]

    # Prepare features for linear regression (day index as feature)
    X = np.arange(len(revenues)).reshape(-1, 1)
    y = np.array(revenues)

    # Fit linear regression model (scikit-learn)
    model = LinearRegression()
    model.fit(X, y)

    # R² score for confidence
    r2 = model.score(X, y)
    confidence = max(round(r2 * 100, 1), 0)

    # Predict next 7 days
    last_date = datetime.strptime(sorted_dates[-1], '%Y-%m-%d')
    forecast_X = np.arange(len(revenues), len(revenues) + 7).reshape(-1, 1)
    forecast_y = model.predict(forecast_X)

    forecast_points = []
    for i, val in enumerate(forecast_y):
        forecast_date = (last_date + timedelta(days=i + 1)).strftime('%Y-%m-%d')
        forecast_points.append({
            'date': forecast_date,
            'revenue': round(max(float(val), 0), 2)  # no negative forecast
        })

    actual_points = [{'date': d, 'revenue': daily[d]} for d in sorted_dates]

    # Trend direction based on slope
    slope = float(model.coef_[0])
    avg_revenue = np.mean(revenues)
    relative_slope = slope / avg_revenue if avg_revenue > 0 else 0

    if relative_slope > 0.02:
        trend = 'INCREASING'
    elif relative_slope < -0.02:
        trend = 'DECREASING'
    else:
        trend = 'STABLE'

    next_week_total = round(sum(max(float(v), 0) for v in forecast_y), 2)

    return jsonify({
        'actual': actual_points,
        'forecast': forecast_points,
        'trend': trend,
        'nextWeekTotal': next_week_total,
        'confidence': confidence,
        'slope': round(slope, 4),
    })


# ════════════════════════════════════════════════════════════════
# FEATURE 5: PRODUCT PERFORMANCE CLASSIFICATION
# ════════════════════════════════════════════════════════════════

@app.route('/ml/product-performance', methods=['POST'])
def product_performance():
    """
    Classifies each product into performance categories:
    - Top Performer: top 20% revenue + positive growth
    - Rising Star: lower revenue but strong growth
    - Stable: moderate revenue, flat growth
    - Declining: negative growth
    - Low Demand: bottom 20% revenue + low order count
    
    Uses trend analysis comparing first-half vs second-half sales.
    """
    data = request.get_json()
    sales = data.get('sales', [])

    if not sales:
        return jsonify([])

    def parse_date(d):
        if isinstance(d, str):
            return datetime.fromisoformat(d.replace('Z', '+00:00').split('T')[0])
        return datetime.now()

    # Group sales by product
    products = {}
    all_dates = []
    for s in sales:
        name = s.get('product', 'Unknown')
        if name not in products:
            products[name] = {'revenue': 0, 'quantity': 0, 'orders': 0, 'sales': []}
        products[name]['revenue'] += s.get('totalAmount', 0)
        products[name]['quantity'] += s.get('quantity', 0)
        products[name]['orders'] += 1
        products[name]['sales'].append({
            'date': parse_date(s.get('date')),
            'amount': s.get('totalAmount', 0)
        })
        all_dates.append(parse_date(s.get('date')))

    if not all_dates:
        return jsonify([])

    # Find midpoint for trend analysis
    all_dates.sort()
    mid_date = all_dates[len(all_dates) // 2]

    # Revenue thresholds
    revenues = [p['revenue'] for p in products.values()]
    if revenues:
        p80 = np.percentile(revenues, 80)
        p20 = np.percentile(revenues, 20)
    else:
        p80 = p20 = 0

    results = []
    for name, pdata in products.items():
        # Calculate growth: 2nd half vs 1st half
        first_half = sum(s['amount'] for s in pdata['sales'] if s['date'] <= mid_date)
        second_half = sum(s['amount'] for s in pdata['sales'] if s['date'] > mid_date)

        if first_half > 0:
            growth = (second_half - first_half) / first_half
        elif second_half > 0:
            growth = 1.0  # all sales in 2nd half = 100% growth
        else:
            growth = 0

        # Classification logic
        revenue = pdata['revenue']
        if revenue >= p80 and growth > -0.1:
            label = 'Top Performer'
            icon = '🏆'
            explanation = f"Highest revenue product with {revenue:.2f} total sales."
        elif growth > 0.3 and revenue < p80:
            label = 'Rising Star'
            icon = '🚀'
            explanation = f"Strong growth of {growth:.0%}. Revenue increased significantly in recent period."
        elif growth < -0.2:
            label = 'Declining'
            icon = '📉'
            explanation = f"Revenue dropped by {abs(growth):.0%}. Needs attention or promotion."
        elif revenue <= p20:
            label = 'Low Demand'
            icon = '⚠️'
            explanation = f"Only {pdata['orders']} orders totaling {revenue:.2f}. Consider bundling or promotions."
        else:
            label = 'Stable'
            icon = '✅'
            explanation = f"Consistent performance with {pdata['orders']} orders."

        # Trend arrow
        if growth > 0.1:
            trend_arrow = '↑'
        elif growth < -0.1:
            trend_arrow = '↓'
        else:
            trend_arrow = '→'

        results.append({
            'product': name,
            'label': label,
            'icon': icon,
            'revenue': round(revenue, 2),
            'quantity': pdata['quantity'],
            'orders': pdata['orders'],
            'growth': round(growth * 100, 1),
            'trendArrow': trend_arrow,
            'explanation': explanation,
        })

    # Sort: Top Performer first, then by revenue
    label_order = {'Top Performer': 0, 'Rising Star': 1, 'Stable': 2, 'Declining': 3, 'Low Demand': 4}
    results.sort(key=lambda x: (label_order.get(x['label'], 5), -x['revenue']))

    return jsonify(results)


# ════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════════════════════════

@app.route('/ml/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'Tenexa ML Service'})


# ════════════════════════════════════════════════════════════════
# FEATURE 6: OCR — INVOICE IMAGE TEXT EXTRACTION (OPTIONAL)
# Requires: pip install pytesseract Pillow
# Also requires Tesseract-OCR installed on the system.
# On Windows: download from https://github.com/UB-Mannheim/tesseract/wiki
# On Ubuntu: sudo apt install tesseract-ocr
# ════════════════════════════════════════════════════════════════

@app.route('/ocr/extract', methods=['POST'])
def ocr_extract():
    """
    POST /ocr/extract
    Accepts an image file, runs Tesseract OCR, then parses structured invoice data.
    Returns { text, parsedRows, metadata }
    """
    print("=" * 60)
    print("[OCR] Incoming request")
    print(f"[OCR] FILES keys: {list(request.files.keys())}")
    sys.stdout.flush()

    try:
        # Accept both 'file' and 'image' keys
        file = request.files.get('file') or request.files.get('image')
        if not file:
            print("[OCR] ERROR: No file in request.files")
            return jsonify({'text': '', 'parsedRows': [], 'error': 'No file uploaded'}), 400

        print(f"[OCR] Filename: {file.filename}")
        print(f"[OCR] Content-Type: {file.content_type}")
        sys.stdout.flush()

        from PIL import Image, ImageFilter

        # Verify Tesseract is reachable
        tess_version = pytesseract.get_tesseract_version()
        print(f"[OCR] Tesseract version: {tess_version}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or '.png')[1]) as tmp:
            file.save(tmp)
            tmp_path = tmp.name

        print(f"[OCR] Temp file saved: {tmp_path} ({os.path.getsize(tmp_path)} bytes)")

        image = Image.open(tmp_path)
        print(f"[OCR] Image opened: size={image.size}, mode={image.mode}")

        # Preprocess: convert to RGB first (handles palette/RGBA), then grayscale + sharpen
        if image.mode in ('P', 'RGBA', 'LA'):
            image = image.convert('RGB')
        image = image.convert('L').filter(ImageFilter.SHARPEN)

        text = pytesseract.image_to_string(image)
        os.unlink(tmp_path)

        print(f"[OCR] Raw text length: {len(text)} chars, lines: {len(text.strip().splitlines())}")
        print(f"[OCR] Raw text:\n{text[:500]}")
        sys.stdout.flush()

        metadata = extract_invoice_metadata(text)
        parsed_rows = parse_invoice_text(text, metadata)

        print(f"[OCR] Metadata: {metadata}")
        print(f"[OCR] Parsed rows: {len(parsed_rows)}")
        for i, row in enumerate(parsed_rows):
            print(f"[OCR]   row {i}: {row['product']} | qty={row['quantity']} | unit={row['unitPrice']} | total={row['totalAmount']}")

        print("[OCR] SUCCESS")
        sys.stdout.flush()

        return jsonify({
            'text': text,
            'parsedRows': parsed_rows,
            'metadata': metadata,
        })

    except Exception as e:
        print(f"[OCR] EXCEPTION: {str(e)}")
        traceback.print_exc()
        sys.stdout.flush()
        return jsonify({'text': '', 'parsedRows': [], 'error': f'OCR failed: {str(e)}'}), 500


# ── Invoice metadata extraction ──────────────────────────────────

def extract_invoice_metadata(text):
    """Extract date, supplier/customer name from invoice header area."""
    metadata = {'date': None, 'customer': None, 'supplier': None}

    # Date patterns (EN + FR)
    date_patterns = [
        r'\b(20\d{2}-\d{2}-\d{2})\b',
        r'\b(\d{1,2}/\d{1,2}/20\d{2})\b',
        r'\b(\d{1,2}-\d{1,2}-20\d{2})\b',
        r'\b(\d{1,2}\.\d{1,2}\.20\d{2})\b',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            metadata['date'] = match.group(1)
            break

    # Customer / Supplier detection via keywords
    lines = text.split('\n')
    customer_kw = ['customer', 'client', 'bill to', 'sold to', 'acheteur', 'destinataire']
    supplier_kw = ['supplier', 'vendor', 'from', 'seller', 'fournisseur', 'vendeur', 'emetteur']

    for i, line in enumerate(lines[:15]):
        lower = line.lower().strip()
        for kw in customer_kw:
            if kw in lower:
                name = re.sub(r'(?i)' + re.escape(kw) + r'[\s:]*', '', line).strip()
                if not name and i + 1 < len(lines):
                    name = lines[i + 1].strip()
                if name and len(name) > 1:
                    metadata['customer'] = name
                break
        for kw in supplier_kw:
            if kw in lower:
                name = re.sub(r'(?i)' + re.escape(kw) + r'[\s:]*', '', line).strip()
                if not name and i + 1 < len(lines):
                    name = lines[i + 1].strip()
                if name and len(name) > 1:
                    metadata['supplier'] = name
                break

    # Fallback: first non-numeric line > 10 chars as supplier
    if not metadata['supplier']:
        for line in lines[:5]:
            cleaned = line.strip()
            if len(cleaned) > 10 and not any(c.isdigit() for c in cleaned[:5]):
                metadata['supplier'] = cleaned
                break

    return metadata


# ── Invoice text parsing ─────────────────────────────────────────

# Keywords that indicate header/footer/summary lines (not product rows)
SKIP_KEYWORDS = [
    'invoice', 'facture', 'date:', 'date :', 'total:', 'total :',
    'sub total', 'sous total', 'subtotal',
    'quantity', 'qty', 'qte', 'price', 'prix', 'amount', 'montant',
    'description', 'designation', 'please', 'thank', 'merci',
    'note:', 'tax ', 'tax(', 'tax:', 'tva', 'shipping', 'livraison',
    'payment', 'paiement',
    'bill to', 'sold to', 'ship to', 'customer:', 'client:',
    'supplier:', 'fournisseur', 'vendeur', 'remise', 'discount',
    'grand total', 'total general', 'net total', 'page ',
]

# Column-header keywords: if 2+ appear on the same line, skip it
HEADER_KEYWORDS = [
    'quantity', 'qty', 'qte', 'price', 'prix', 'amount', 'montant',
    'description', 'designation', 'item', 'product',
]

# Regex patterns for lines that are clearly not product rows
SKIP_LINE_PATTERNS = [
    r'^\s*[-=_*]{3,}\s*$',
    r'^\s*\d+\s*/\s*\d+\s*$',
    r'^\s*\d{1,5}\s+\w+\s+(ave|st|rd|blvd|street|road|suite|floor)',
    r'^\s*#?\d{3,}[-\s]?\d{3,}',
    r'^\s*(tel|phone|fax|email|web|www)\b',
    r'(?:^|\s)date\s*:?\s*\d',
    r'^\s*(due|issued|paid)\s',
]


def _is_skip_line(line):
    """Check if a line is a header, footer, or summary — not a product row."""
    lower = line.lower().strip()

    # Column-header detection: "Item  Qty  Price  Total"
    for hkw in HEADER_KEYWORDS:
        if lower.startswith(hkw):
            if sum(1 for h in HEADER_KEYWORDS if h in lower) >= 2:
                return True

    # Keyword-based skip (smart: allows products that happen to contain a keyword)
    for kw in SKIP_KEYWORDS:
        if kw in lower:
            kw_pos = lower.index(kw)
            after_kw = lower[kw_pos + len(kw):].strip()
            if len(after_kw) < 5:
                return True
            if kw_pos < 3:
                prices_after = re.findall(r'\$[\d,.]+|\d+\.\d{2}', after_kw)
                if len(prices_after) <= 1:
                    return True

    # Regex pattern skip
    for pattern in SKIP_LINE_PATTERNS:
        if re.search(pattern, lower):
            return True

    return False


def parse_invoice_text(text, metadata):
    """Parse OCR invoice text into structured rows."""
    rows = []
    for line in text.strip().split('\n'):
        line = line.strip()
        if not line or len(line) < 3:
            continue
        if _is_skip_line(line):
            continue
        parsed = parse_invoice_line(line, metadata)
        if parsed:
            rows.append(parsed)
    return rows


def parse_invoice_line(line, metadata):
    """
    Parse a single invoice line using right-to-left number assignment.

    Strategy:
    1. Find all number tokens with their string positions
    2. Classify as "price" ($X.XX or X.XX with 2 decimals) vs "plain integer"
    3. Rightmost 2 price tokens → totalAmount, unitPrice
    4. Rightmost plain integer before unitPrice (with text to its left) → quantity
    5. Everything left of quantity position → product name
    """
    line = line.strip()
    if not line or len(line) < 3:
        return None

    cleaned = re.sub(r'[|]', '  ', line)

    # Find all number-like tokens with positions
    tokens = []
    for m in re.finditer(r'\$?[\d,]+(?:\.\d+)?', cleaned):
        raw = m.group()
        num_str = raw.replace('$', '').replace(',', '')
        try:
            val = float(num_str)
        except ValueError:
            continue
        if val <= 0:
            continue
        is_price = ('$' in raw) or ('.' in raw and len(raw.split('.')[-1]) == 2)
        tokens.append({
            'raw': raw, 'val': val, 'start': m.start(), 'end': m.end(),
            'is_price': is_price,
        })

    if len(tokens) < 2:
        return None

    tokens.sort(key=lambda t: t['start'])
    price_tokens = [t for t in tokens if t['is_price']]

    total_amount = None
    unit_price = None
    qty = None
    name_end_pos = 0

    if len(price_tokens) >= 2:
        # Best case: 2+ price tokens (e.g. "$15.00  $30.00")
        total_amount = price_tokens[-1]['val']
        unit_price = price_tokens[-2]['val']
        name_end_pos = price_tokens[-2]['start']

        # Find quantity: rightmost plain integer before unitPrice with text to its left
        for t in reversed(tokens):
            if t['start'] >= price_tokens[-2]['start']:
                continue
            if not t['is_price'] and t['val'] == int(t['val']) and t['val'] < 10000:
                text_left = cleaned[:t['start']].strip()
                alpha_left = re.sub(r'[^a-zA-Z]', '', text_left)
                if len(alpha_left) >= 2:
                    qty = t['val']
                    name_end_pos = t['start']
                    break

        if qty is None:
            # Infer quantity from total / unitPrice
            if unit_price > 0:
                inferred = total_amount / unit_price
                if abs(inferred - round(inferred)) < 0.01 and inferred > 0:
                    qty = round(inferred)
                else:
                    qty = 1
            else:
                qty = 1

    elif len(price_tokens) == 1:
        # One price token — look for a plain integer as quantity
        price_t = price_tokens[0]
        plain_before = [t for t in tokens if t['start'] < price_t['start'] and not t['is_price']]
        if plain_before:
            qty_t = plain_before[-1]
            qty = qty_t['val']
            unit_price = price_t['val']
            total_amount = round(qty * unit_price, 2)
            name_end_pos = qty_t['start']
        else:
            return None

    else:
        # No price tokens — positional: last 3 numbers are qty, unit, total
        if len(tokens) >= 3:
            qty = tokens[-3]['val']
            unit_price = tokens[-2]['val']
            total_amount = tokens[-1]['val']
            name_end_pos = tokens[-3]['start']
        elif len(tokens) == 2:
            if tokens[0]['val'] <= tokens[1]['val']:
                qty = tokens[0]['val']
                total_amount = tokens[1]['val']
                unit_price = total_amount / qty if qty > 0 else total_amount
            else:
                qty = tokens[1]['val']
                total_amount = tokens[0]['val']
                unit_price = total_amount / qty if qty > 0 else total_amount
            name_end_pos = tokens[0]['start']

    if qty is None or qty <= 0 or unit_price is None:
        return None

    # Extract product name: everything left of the first assigned numeric token
    product = cleaned[:name_end_pos]
    product = re.sub(r'[|$€£¥@×*#\t]+', ' ', product)
    product = re.sub(r'\s+', ' ', product).strip(' -:,.')
    product = re.sub(r'\s*x\s*$', '', product, flags=re.IGNORECASE)
    product = re.sub(r'\s*\d*\s*pcs?\s*$', '', product, flags=re.IGNORECASE)
    product = product.strip()

    if not product or len(product) < 2:
        return None
    if qty > 99999:
        return None

    # Validate total ≈ qty × unitPrice (allow 5% OCR variance)
    expected = round(qty * unit_price, 2)
    if total_amount and expected > 0:
        if abs(total_amount - expected) / max(expected, 0.01) > 0.05:
            total_amount = expected
    if total_amount is None:
        total_amount = expected

    return {
        'product': product,
        'item': product,
        'quantity': round(qty, 2),
        'unitPrice': round(unit_price, 2),
        'unitCost': round(unit_price, 2),
        'totalAmount': round(total_amount, 2),
        'totalCost': round(total_amount, 2),
        'date': metadata.get('date'),
        'customer': metadata.get('customer'),
        'supplier': metadata.get('supplier'),
    }


# ════════════════════════════════════════════════════════════════
# FEATURE 7: AI PURCHASE ANALYSIS & APPROVAL
# ════════════════════════════════════════════════════════════════

@app.route('/ml/analyze-purchase', methods=['POST'])
def analyze_purchase():
    """
    Evaluates a new purchase request against rules and history.
    Input: { current: {...}, history: [...] }
    """
    data = request.get_json()
    current = data.get('current', {})
    history = data.get('history', [])
    
    amount = current.get('totalCost', 0)
    category = (current.get('category', '')).strip().lower()
    item = (current.get('item', '')).strip().lower()
    
    # 1. Budget Rule (Simple heuristic: max allowed single purchase = 5000)
    MAX_BUDGET = 5000
    
    # 2. Category Authorization
    AUTHORIZED_CATEGORIES = ['inventory', 'office supplies', 'electronics', 'maintenance', 'marketing', 'travel', 'food']
    
    decision = 'APPROVED'
    confidence = 90
    flags = []
    reasoning = []
    
    # Rule checks
    if amount > MAX_BUDGET:
        decision = 'REJECTED'
        confidence = 95
        flags.append('Over budget')
        reasoning.append(f"Amount {amount} exceeds the single purchase limit of {MAX_BUDGET}.")
        
    if category and category not in AUTHORIZED_CATEGORIES:
        flags.append('Unauthorized category')
        if decision == 'APPROVED':
            decision = 'REJECTED'
            confidence = 85
        reasoning.append(f"Category '{category}' is not in the list of pre-authorized categories.")

    # 3. Suspicious Activity (Double check identical items within 24h)
    duplicates = [h for h in history if h.get('item', '').lower() == item and abs(h.get('totalCost', 0) - amount) < 1]
    if duplicates:
        flags.append('Duplicate entry risk')
        confidence -= 15
        reasoning.append(f"A similar purchase for '{item}' was found in recent history. Possible duplicate.")

    # 4. Validating item name
    if len(item) < 3:
        flags.append('Vague description')
        confidence -= 10
        reasoning.append("The item name is too short or vague.")

    if decision == 'APPROVED':
        if not reasoning:
            reasoning.append("Purchase details align with company policy and historical patterns.")
    
    return jsonify({
        'decision': decision,
        'confidence': confidence,
        'flags': flags,
        'explanation': " ".join(reasoning)
    })


if __name__ == '__main__':
    print("Tenexa ML Service running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
