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
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

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
            risk = 'High'
        elif days_until_stockout < 21:
            risk = 'Medium'
        else:
            risk = 'Low'

        # Reorder recommendation (30-day supply + 25% safety stock)
        reorder_qty = 0
        urgency = 'None'
        explanation = ''
        if risk in ('High', 'Medium'):
            reorder_qty = int(np.ceil(daily_velocity * 30 * 1.25))
            if risk == 'High':
                urgency = 'Urgent'
                explanation = f"Stock critically low. At current sales rate of {daily_velocity:.1f} units/day, stock will run out in ~{int(days_until_stockout)} days. Order {reorder_qty} units immediately."
            else:
                urgency = 'Soon'
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
        margin_score = min(max(margin * 100, 0), 100)  # clamp 0-100
    else:
        margin_score = 0
    factors.append({
        'name': 'Profit Margin',
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
    trend_dir = 'Increasing' if trend_score > 55 else ('Decreasing' if trend_score < 45 else 'Stable')
    factors.append({
        'name': 'Revenue Trend',
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
        'name': 'Cost Efficiency',
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
        'name': 'Sales Consistency',
        'score': round(consistency_score, 1),
        'weight': 15,
        'detail': f"Sales volatility: {'Low' if consistency_score > 60 else 'High'}"
    })

    # 5. Inventory Risk Score (15%)
    # Simplified: ratio of products without stock issues
    sold_products = set((s.get('product') or '').strip().lower() for s in sales)
    purchased_products = set((p.get('item') or '').strip().lower() for p in purchases)
    covered = len(sold_products & purchased_products)
    total_products = len(sold_products)
    inventory_score = (covered / total_products * 100) if total_products > 0 else 50
    factors.append({
        'name': 'Inventory Coverage',
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
        'name': 'Growth Rate',
        'score': round(growth_score, 1),
        'weight': 10,
        'detail': f"Month-over-month growth: {'Positive' if growth_score > 55 else ('Negative' if growth_score < 45 else 'Flat')}"
    })

    # Weighted total
    total_score = sum(f['score'] * f['weight'] / 100 for f in factors)
    total_score = min(max(round(total_score, 1), 0), 100)

    if total_score >= 70:
        status = 'Healthy'
        explanation = 'Your company shows strong financial health with good margins and consistent sales.'
    elif total_score >= 40:
        status = 'Warning'
        weak = min(factors, key=lambda f: f['score'])
        explanation = f"Some areas need attention. Weakest factor: {weak['name']} ({weak['score']:.0f}/100)."
    else:
        status = 'Critical'
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
            'trend': 'No Data',
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
            'trend': 'Insufficient Data',
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
        trend = 'Increasing'
    elif relative_slope < -0.02:
        trend = 'Decreasing'
    else:
        trend = 'Stable'

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


if __name__ == '__main__':
    print("🧠 Tenexa ML Service running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
