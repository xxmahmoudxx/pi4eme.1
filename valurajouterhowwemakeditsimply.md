# Valeur Ajoutée — How We Made It Simply

> This file explains every AI/ML feature in the project in **simple, direct, memorizable** language.
> Use it to prepare for your oral defense with your professor.

---

## A. Project Architecture in Simple Words

Our app has **4 parts** that talk to each other:

```
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│   Angular      │──────▶│   NestJS       │──────▶│   Python Flask │
│   Frontend     │◀──────│   Backend      │◀──────│   ML Service   │
│   (port 4200)  │       │   (port 3000)  │       │   (port 5000)  │
└────────────────┘       └───────┬────────┘       └────────────────┘
                                 │
                                 ▼
                         ┌────────────────┐
                         │   MongoDB      │
                         │   Database     │
                         └────────────────┘
```

| Part | What it does | Technology |
|------|-------------|------------|
| **Frontend** | What the user sees. Pages, buttons, charts. | Angular 17 |
| **Backend** | Handles requests, protects data, talks to DB and Python. | NestJS (Node.js) |
| **ML Service** | Does the smart calculations. Predictions, scores, classifications. | Python Flask + scikit-learn + NumPy |
| **Database** | Stores purchases and sales data, one collection per user. | MongoDB |

**Who talks to who:**
- The **user** only talks to Angular (the browser).
- Angular talks to NestJS through **HTTP requests**.
- NestJS talks to MongoDB to **read/write data**.
- NestJS talks to Python to **ask for AI results**.
- Python **never touches the database directly**. It only receives data and returns results.

**Why Python never touches the database:**
- This keeps data **isolated per user**. NestJS filters data by `companyId` before sending.
- Python is **stateless** — it just computes and returns.

---

## B. Global Full Flow: From CSV to AI Result

Here is the full journey of data, step by step:

```
1. User uploads CSV file → Angular frontend
2. Angular sends file → NestJS backend (POST /purchases/upload or /sales/upload)
3. NestJS parses CSV → saves rows into MongoDB (with user's companyId)
4. User navigates to a dashboard page
5. Angular calls API → e.g. GET /analytics/stockout-risks
6. NestJS reads purchases + sales from MongoDB (only this user's data)
7. NestJS sends JSON to Python → POST http://localhost:5000/ml/stockout
8. Python runs algorithm → returns JSON result
9. NestJS sends result back to Angular
10. Angular displays result as cards, charts, gauges in the UI
```

**Key point:** The AI doesn't run on old static data. Every time the user opens a page, **fresh data is sent to Python and fresh results come back.**

---

## C. Why This Project Has "Valeur Ajoutée"

A simple CRUD app can:
- Create, Read, Update, Delete data
- Show tables and lists

**Our app does MORE:**
- It **predicts** which products will run out of stock
- It **recommends** how many units to reorder
- It **scores** the company's financial health
- It **forecasts** future revenue using machine learning
- It **classifies** products into performance categories

| Simple CRUD App | Our App |
|----------------|---------|
| Shows a list of purchases | Predicts which products will run out |
| Shows total revenue | Forecasts future revenue with ML |
| Shows a table of sales | Classifies products as "Top Performer" or "Declining" |
| No intelligence | Computes a health score from 6 factors |

**The valeur ajoutée = the app thinks for the user.** It doesn't just show data. It **analyzes**, **predicts**, and **recommends actions**.

---

## D. Difference Between Display, Calculation, Analytics, and ML

| Term | What it means | Example in our app |
|------|--------------|-------------------|
| **Simple display** | Just showing stored data | The table of recent purchases |
| **Backend calculation** | Computing totals, averages | Total revenue KPI card |
| **Analytics** | Comparing data over time, finding patterns | Revenue by supplier chart |
| **Rule-based classification** | Using IF/THEN rules to label data | Product Performance (if revenue > 80th percentile → "Top Performer") |
| **Scoring model** | Computing a weighted score from multiple factors | Company Health Score (6 factors × weights = score 0-100) |
| **Machine Learning** | A model **learns from data** and makes predictions | Revenue Forecast (scikit-learn LinearRegression learns the trend and predicts future) |
| **Forecasting** | Predicting future values based on past data | Revenue Forecast (predicts next 7 days) |

**Important:** Not everything in our app is "pure ML." Some features are **analytics** or **rule-based intelligence**. That's normal and honest. The Revenue Forecast is the most "pure ML" feature because it uses scikit-learn.

---

## E. Top 10 Things to Memorize for Oral Defense

1. **Architecture:** Angular → NestJS → Python Flask → MongoDB. Python never touches the DB.
2. **Data isolation:** All queries filter by `companyId`. Each user only sees their own data and AI results.
3. **Revenue Forecast uses real ML:** scikit-learn `LinearRegression`. It learns a line from past revenue and extends it.
4. **Health Score is a weighted scoring model:** 6 factors, each with a weight. Total = sum of (factor score × weight).
5. **Stockout prediction is demand estimation:** estimated_stock = purchased - sold. days_left = stock / daily_sales_speed.
6. **Product classification uses percentile thresholds and growth rate:** P80/P20 revenue + 1st-half vs 2nd-half comparison.
7. **Reorder recommendation uses safety stock formula:** reorder_qty = daily_velocity × 30 days × 1.25 (25% safety margin).
8. **Python receives raw data, computes, returns JSON.** It does not store anything.
9. **The ML service is a microservice.** It runs separately from the backend. They communicate via HTTP POST.
10. **Every AI result is computed live**, not pre-stored. When the user opens the page, fresh computation happens.

---

---

# FEATURE-BY-FEATURE ANALYSIS

---

## Feature 1: Stockout Risk Prediction

### 1. Simple idea

The system looks at how much of each product you **bought** (purchases) and how much you **sold** (sales).
It calculates how much stock is left.
Then it calculates how fast you're selling.
Then it predicts: **"In X days, this product will run out."**
If X is small, it says: **"High risk!"**

### 2. User value

A business owner can see **which products are about to run out** before it actually happens. This means they can **order more in time** and avoid losing sales. Without this feature, they would need to manually track every product — which is slow and error-prone.

### 3. Why this is AI / ML / analytics

- **Type: Prediction + Scoring**
- It is **prediction** because it estimates a future event (stockout date) from historical data.
- It is **scoring** because it assigns a risk level (High / Medium / Low).
- It is **not just display** because the database doesn't store "risk level" anywhere. The system **computes it from raw purchase/sales data**.
- Technically this is **demand estimation** — a well-known concept in supply chain analytics.

### 4. Full data flow

| Step | What happens | Where |
|------|-------------|-------|
| 1 | User uploads `sample-purchases.csv` | Angular → `POST /purchases/upload` |
| 2 | User uploads `sample-sales.csv` | Angular → `POST /sales/upload` |
| 3 | NestJS parses CSV, saves to MongoDB | `purchases.service.ts` → `importCsv()` |
| 4 | User opens `/purchases` page | Angular `purchases-dashboard.component.ts` |
| 5 | Angular calls `GET /analytics/stockout-risks` | `api.service.ts` → `getStockoutRisks()` |
| 6 | NestJS receives request, reads purchases + sales from MongoDB | `analytics.service.ts` → `callMl()` lines 20-44 |
| 7 | NestJS sends JSON to Python | `POST http://localhost:5000/ml/stockout` |
| 8 | Python computes risk for each product | `app.py` → `stockout_prediction()` lines 28-133 |
| 9 | Python returns JSON array of products with risk levels | JSON response |
| 10 | NestJS forwards result to Angular | HTTP response |
| 11 | Angular displays alert cards with risk badges | `purchases-dashboard.component.ts` → AI section template |

### 5. Critical files

| Layer | File | Role |
|-------|------|------|
| Frontend | `frontend/src/app/pages/purchases-dashboard.component.ts` | Displays alert cards, calls `getStockoutRisks()` |
| Frontend | `frontend/src/app/services/api.service.ts` | `getStockoutRisks()` — line 86 |
| Backend | `backend/src/analytics/analytics.controller.ts` | `getStockoutRisks()` — line 10-13 |
| Backend | `backend/src/analytics/analytics.service.ts` | `getStockoutRisks()` — line 46-52, `callMl()` — lines 20-44 |
| Python ML | `ml-service/app.py` | `stockout_prediction()` — lines 28-133 |
| Database | MongoDB `purchases_flat` + `sales_flat` collections | Raw purchase and sales records |

### 6. Critical code references

- `ml-service/app.py` — function `stockout_prediction()` — lines 28-133 — **the core algorithm**: aggregates purchases by item, sales by product, computes stock, velocity, days until stockout, risk level, reorder qty
- `ml-service/app.py` — lines 57-61 — aggregates total purchased quantity per product
- `ml-service/app.py` — lines 64-71 — aggregates total sold quantity per product
- `ml-service/app.py` — line 77 — `estimated_stock = max(total_purchased - total_sold, 0)`
- `ml-service/app.py` — line 87 — `daily_velocity = total_sold / days_span`
- `ml-service/app.py` — line 91 — `days_until_stockout = estimated_stock / daily_velocity`
- `ml-service/app.py` — lines 96-101 — risk classification: High (<7), Medium (7-21), Low (>21)
- `ml-service/app.py` — line 108 — reorder formula: `ceil(daily_velocity * 30 * 1.25)`
- `backend/src/analytics/analytics.service.ts` — method `callMl()` — lines 20-44 — fetches data from MongoDB, POSTs to Python
- `frontend/src/app/pages/purchases-dashboard.component.ts` — method `loadAi()` — calls the API and stores result

### 7. Logic in simple words

1. **Count total bought** for each product (from purchases)
2. **Count total sold** for each product (from sales)
3. **Remaining stock** = bought − sold
4. **Sales speed** = total_sold ÷ number_of_days_selling
5. **Days left** = remaining_stock ÷ sales_speed
6. **Risk level:**
   - Less than 7 days → **High** 🔴
   - 7 to 21 days → **Medium** 🟡
   - More than 21 days → **Low** 🟢

### 8. Why this is not only "affichage"

The database stores **raw purchase records** and **raw sale records**. It does NOT store:
- estimated stock
- daily sales velocity
- days until stockout
- risk level

All of these are **computed by the Python ML service** from raw data. The system is:
- ✅ **Transforming** raw data into insights
- ✅ **Inferring** future stock levels from past behavior
- ✅ **Predicting** a future event (stockout date)
- ✅ **Classifying** risk level based on thresholds

This is clearly **not just displaying stored values**.

### 9. What I can say to my professor

**Very short version:**
> "This feature predicts which products will run out of stock by analyzing purchase and sales history."

**Normal oral version:**
> "The system calculates estimated stock by subtracting total sold from total purchased. Then it computes a daily sales velocity and estimates how many days until the product runs out. Products with less than 7 days are flagged as High Risk. This is done in Python using demand estimation."

**Slightly more technical:**
> "We implemented a demand estimation model in Python Flask. The NestJS backend fetches user-scoped purchase and sales data from MongoDB, sends it as JSON to the Python microservice. The Python code aggregates supply and demand per product, computes the daily sales velocity as `total_sold / days_span`, estimates remaining stock, and classifies stockout risk using threshold-based scoring. The formula for reorder quantity includes a 25% safety stock margin."

### 10. Memorization box

| | |
|---|---|
| **Input** | All purchases + all sales for this user |
| **Processing** | Calculate stock = bought − sold, speed = sold/days, days_left = stock/speed |
| **Output** | Per product: risk level, estimated stock, days until stockout, reorder qty |
| **ML type** | Prediction + Scoring (demand estimation) |
| **Business value** | Prevents stockouts, saves money, helps with purchasing decisions |

---

## Feature 2: Reorder Recommendation

### 1. Simple idea

For products that are at risk of running out, the system tells you: **"Buy X units now."**
It calculates a smart quantity based on how fast you're selling and adds a 25% safety margin.

### 2. User value

Instead of guessing how much to order, the user gets a **specific number.** This prevents both stockouts (ordering too little) and waste (ordering too much).

### 3. Why this is AI / ML / analytics

- **Type: Recommendation**
- It is a **recommendation system** because it suggests a specific action (buy X units).
- It uses the same demand estimation data as the stockout prediction.
- The formula is based on **safety stock theory** from supply chain management.
- Formula: `reorder_qty = ceil(daily_velocity × 30 × 1.25)`
  - 30 = cover 30 days of sales
  - 1.25 = add 25% extra as safety buffer

### 4. Full data flow

Same as Stockout Risk Prediction — they share the same endpoint.
The reorder recommendation is computed **inside the same Python function** (`stockout_prediction()`) at lines 103-114.

### 5. Critical files

Same table as Feature 1. The reorder logic is embedded in the stockout endpoint.

### 6. Critical code references

- `ml-service/app.py` — lines 103-114 — computes `reorder_qty` and sets `urgency` level
- `ml-service/app.py` — line 108 — key formula: `int(np.ceil(daily_velocity * 30 * 1.25))`
- `ml-service/app.py` — lines 109-114 — sets urgency to "Urgent" for High risk, "Soon" for Medium risk, generates human-readable explanation

### 7. Logic in simple words

1. Take the **daily sales speed** (already computed in Feature 1)
2. Multiply by **30** (to cover one month of stock)
3. Multiply by **1.25** (to add 25% safety margin)
4. Round up to get a whole number
5. If risk is High → urgency = "Urgent"
6. If risk is Medium → urgency = "Soon"

### 8. Why this is not only "affichage"

The database does not store any reorder recommendation. The system **generates** a specific quantity based on recent sales behavior. This is:
- ✅ A **recommendation** computed from data patterns
- ✅ Uses **safety stock logic** — a real supply chain management concept
- ✅ Changes dynamically when new sales or purchases are added

### 9. What I can say to my professor

**Very short:**
> "For risky products, the system recommends exactly how many units to reorder."

**Normal:**
> "The reorder quantity is calculated using the daily sales velocity multiplied by 30 days plus a 25% safety stock margin. Products with High risk get an 'Urgent' label. This is generated dynamically by the Python service each time the user views the dashboard."

**Technical:**
> "We use a simplified Economic Order Quantity approach. The formula is `ceil(daily_velocity × 30 × 1.25)`, where 30 represents a month of coverage and 1.25 adds a safety stock buffer. This is a common recommendation approach in supply chain analytics."

### 10. Memorization box

| | |
|---|---|
| **Input** | Daily sales velocity from demand estimation |
| **Processing** | reorder_qty = ceil(velocity × 30 × 1.25) |
| **Output** | Number of units to buy, urgency level, explanation text |
| **ML type** | Recommendation (safety stock model) |
| **Business value** | Tells the user exactly what to buy, prevents guessing |

---

## Feature 3: Company Health Score

### 1. Simple idea

The system gives your company a **score from 0 to 100**. Like a health checkup, but for your business.
It looks at 6 different factors:
- Are you making profit?
- Are your sales growing?
- Are your costs under control?
- Are your sales consistent?
- Is your inventory well covered?
- Are you growing month to month?

It combines all of these into one number.

### 2. User value

Instead of looking at 10 different charts and trying to figure out if the company is doing well, the user gets **one clear number** and a status: Healthy ✅, Warning ⚠️, or Critical 🔴. The factor breakdown shows **which areas need improvement**.

### 3. Why this is AI / ML / analytics

- **Type: Scoring model (weighted aggregation)**
- It is a **scoring model** because it computes a numeric score from multiple factors.
- Each factor has a **weight** (importance level). The weights are: Profit Margin 25%, Revenue Trend 20%, Cost Efficiency 15%, Sales Consistency 15%, Inventory Coverage 15%, Growth Rate 10%.
- The final score = sum of (each factor's score × its weight).
- **Honest note:** This is a **heuristic scoring model**, not a trained ML model. It uses analytics and feature engineering. But it is a legitimate approach used in real business intelligence systems.

### 4. Full data flow

| Step | What happens | Where |
|------|-------------|-------|
| 1 | User opens `/report` page | Angular `report-dashboard.component.ts` |
| 2 | Angular calls `GET /analytics/health-score` | `api.service.ts` → `getHealthScore()` |
| 3 | NestJS reads purchases + sales from MongoDB | `analytics.service.ts` → `callMl()` |
| 4 | NestJS sends to Python | `POST http://localhost:5000/ml/health-score` |
| 5 | Python computes 6 factor scores, weighted total | `app.py` → `health_score()` lines 141-304 |
| 6 | Result returned to Angular | JSON with score, status, factors array |
| 7 | Angular shows score badge, gauge bar, factor breakdown | `report-dashboard.component.ts` |

### 5. Critical files

| Layer | File | Role |
|-------|------|------|
| Frontend | `frontend/src/app/pages/report-dashboard.component.ts` | Shows health score, gauge, factor bars |
| Backend | `backend/src/analytics/analytics.service.ts` | `getHealthScore()` — line 55-62 |
| Python ML | `ml-service/app.py` | `health_score()` — lines 141-304 |

### 6. Critical code references

- `ml-service/app.py` — function `health_score()` — lines 141-304 — the full scoring engine
- Line 169 — `total_revenue = sum(s.get('totalAmount', 0) for s in sales)`
- Line 170 — `total_costs = sum(p.get('totalCost', 0) for p in purchases)`
- Line 177 — `margin = profit / total_revenue` → Profit Margin factor
- Lines 189-208 — Revenue Trend: splits sales in half, compares 1st half vs 2nd half
- Lines 229-233 — Sales Consistency: uses NumPy `np.mean()` and `np.std()` to compute coefficient of variation
- Lines 245-249 — Inventory Coverage: checks which sold products have matching purchases
- Line 281 — `total_score = sum(f['score'] * f['weight'] / 100 for f in factors)` — **the key formula**
- Lines 284-294 — Status classification: ≥70 Healthy, 40-69 Warning, <40 Critical

### 7. Logic in simple words

1. Calculate **Profit Margin**: (revenue - costs) / revenue × 100
2. Calculate **Revenue Trend**: compare revenue in the first half of time vs second half
3. Calculate **Cost Efficiency**: 1 - (costs / revenue)
4. Calculate **Sales Consistency**: are daily sales amounts similar or wildly different? (uses standard deviation)
5. Calculate **Inventory Coverage**: what % of sold products have matching purchase supply?
6. Calculate **Growth Rate**: compare last month's revenue to previous month
7. **Multiply each score by its weight**, add them up → final score 0-100
8. ≥70 = Healthy, 40-69 = Warning, <40 = Critical

### 8. Why this is not only "affichage"

The database stores individual purchase and sale records. It does NOT store:
- any "health score"
- any factor breakdown
- any status label

The Python service **creates all of this from raw data** using:
- ✅ **Feature engineering** (creating 6 meaningful factors from raw records)
- ✅ **Statistical computation** (mean, standard deviation, coefficient of variation via NumPy)
- ✅ **Weighted aggregation** (combining factors with importance weights)
- ✅ **Classification** (score → status label)

### 9. What I can say to my professor

**Very short:**
> "The system computes a financial health score from 0 to 100 using 6 weighted factors."

**Normal:**
> "We built a weighted scoring model with 6 factors: profit margin, revenue trend, cost efficiency, sales consistency, inventory coverage, and growth rate. Each factor gets a score from 0 to 100, then we multiply by its weight and sum them up. The weights total 100%. A score above 70 means Healthy, below 40 means Critical."

**Technical:**
> "The health score uses a multi-factor weighted aggregation model. We perform feature engineering on raw purchase and sales data to extract 6 KPIs. The sales consistency factor uses the coefficient of variation (standard deviation divided by mean), computed with NumPy. The final score is `Σ(factor_score × weight)`. This is a heuristic scoring model — similar to credit scoring approaches — not a trained classifier."

### 10. Memorization box

| | |
|---|---|
| **Input** | All purchases + all sales for this user |
| **Processing** | 6 factors computed, each scored 0-100, weighted sum |
| **Output** | Score 0-100, status (Healthy/Warning/Critical), factor breakdown |
| **ML type** | Scoring model (weighted aggregation + feature engineering) |
| **Business value** | One number tells you if your company is doing well or not |

---

## Feature 4: Revenue Forecast

### 1. Simple idea

The system looks at your **past daily revenue** and draws a trend line.
Then it **extends that line into the future** to predict what your revenue will be for the next 7 days.
This uses **scikit-learn**, a real Python machine learning library.

### 2. User value

A business owner can see: "Based on my current trend, next week I should earn about X." This helps with **planning, budgeting, and decision-making**.

### 3. Why this is AI / ML / analytics

- **Type: Forecasting (Time Series) — Real Machine Learning**
- This is the **most "pure ML" feature** in the project.
- It uses `LinearRegression` from **scikit-learn**, a real ML library.
- The model **learns from data**: it finds the best-fit line through past revenue points.
- Then it **predicts future values** by extending that line.
- It also computes an **R² confidence score** — a real ML evaluation metric that tells you how well the model fits the data.
- **R² (R-squared)** means: "how much of the variation in data does the model explain?" R²=100% means perfect fit.

### 4. Full data flow

| Step | What happens | Where |
|------|-------------|-------|
| 1 | User opens `/report` page | Angular `report-dashboard.component.ts` |
| 2 | Angular calls `GET /analytics/sales-forecast` | `api.service.ts` → `getSalesForecast()` |
| 3 | NestJS reads sales from MongoDB | `analytics.service.ts` → `callMl()` |
| 4 | NestJS sends to Python | `POST http://localhost:5000/ml/forecast` |
| 5 | Python aggregates daily revenue, fits LinearRegression | `app.py` → `sales_forecast()` lines 312-402 |
| 6 | Model predicts next 7 days | `model.predict(forecast_X)` — line 369 |
| 7 | Result returned: actual points + forecast points + trend | JSON response |
| 8 | Angular draws chart with solid line (actual) and dashed line (forecast) | `report-dashboard.component.ts` → `buildForecastChart()` |

### 5. Critical files

| Layer | File | Role |
|-------|------|------|
| Frontend | `frontend/src/app/pages/report-dashboard.component.ts` | Shows forecast chart with actual + predicted lines |
| Backend | `backend/src/analytics/analytics.service.ts` | `getSalesForecast()` — line 64-71 |
| Python ML | `ml-service/app.py` | `sales_forecast()` — lines 312-402 |

### 6. Critical code references

- `ml-service/app.py` — function `sales_forecast()` — lines 312-402 — **the main ML feature**
- Line 17 — `from sklearn.linear_model import LinearRegression` — **imports the ML model**
- Lines 336-339 — aggregates daily revenue from raw sales
- Line 355 — `X = np.arange(len(revenues)).reshape(-1, 1)` — creates feature matrix (day index)
- Line 356 — `y = np.array(revenues)` — target variable (revenue per day)
- Lines 359-360 — **`model = LinearRegression()` then `model.fit(X, y)`** — this is where the model LEARNS
- Line 363 — `r2 = model.score(X, y)` — R² confidence metric
- Line 369 — `forecast_y = model.predict(forecast_X)` — **this is where the model PREDICTS**
- Lines 382-391 — determines trend direction based on slope: if slope/average > 0.02 → Increasing

### 7. Logic in simple words

1. Take all sales and **group revenue by day** (e.g., Jan 3: $400, Jan 7: $250, etc.)
2. Turn each day into a **number** (day 0, day 1, day 2...)
3. Put days as X and revenue as Y
4. Use **LinearRegression** to find the best straight line through these points
   - The line has a formula: `revenue = slope × day + intercept`
   - The model "learns" the slope and intercept from data
5. **Extend the line** 7 more days into the future → those are the predictions
6. Calculate **R²** to know how confident the prediction is
7. If the slope is positive → trend = "Increasing"
8. If the slope is negative → trend = "Decreasing"
9. If the slope is near zero → trend = "Stable"

### 8. Why this is not only "affichage"

This is the clearest case of **real machine learning** in the project:
- ✅ Uses `scikit-learn`, a real ML library
- ✅ The model **learns** from data (`model.fit()`)
- ✅ The model **predicts** unseen future values (`model.predict()`)
- ✅ Has a **confidence metric** (R² score)
- ✅ The predicted values **do not exist in the database** — they are generated by the model
- ✅ This is **supervised learning** — the model learns the relationship between time and revenue

### 9. What I can say to my professor

**Very short:**
> "We use scikit-learn Linear Regression to forecast next week's revenue from past sales data."

**Normal:**
> "The system aggregates daily revenue into a time series. We fit a Linear Regression model using scikit-learn — the X axis is the day index and Y is the revenue. The model learns the trend, then predicts the next 7 days. We also compute an R-squared confidence score to measure how reliable the prediction is."

**Technical:**
> "This is a supervised learning approach using scikit-learn's LinearRegression. The feature matrix X is the day ordinal index reshaped to (-1,1), and the target y is the daily aggregated revenue. After fitting, we use `model.predict()` to extrapolate 7 future points. The model's slope determines the trend direction. R² is computed with `model.score(X, y)` to quantify prediction confidence. For larger datasets, this could be upgraded to ARIMA or Prophet."

### 10. Memorization box

| | |
|---|---|
| **Input** | All sales records → aggregated into daily revenue time series |
| **Processing** | scikit-learn LinearRegression: `model.fit(X, y)` then `model.predict()` |
| **Output** | 7-day revenue forecast, trend direction, R² confidence, chart data |
| **ML type** | Forecasting — Supervised Learning — Linear Regression |
| **Business value** | Helps predict future income for planning and budgeting |

---

## Feature 5: Product Performance Classification

### 1. Simple idea

The system looks at every product you sell and gives it a **label**:
- 🏆 **Top Performer** — sells a lot, growing or stable
- 🚀 **Rising Star** — not the biggest yet, but growing fast
- ✅ **Stable** — decent sales, no big changes
- 📉 **Declining** — sales are dropping
- ⚠️ **Low Demand** — barely selling

### 2. User value

The user can see **at a glance** which products are driving the business and which need attention. This helps with marketing decisions, inventory management, and product strategy.

### 3. Why this is AI / ML / analytics

- **Type: Classification (rule-based)**
- It is **classification** because it assigns each product to a category.
- It uses **percentile thresholds** — the 80th and 20th percentile of revenue — to define "high" and "low."
  - Percentile = "what percentage of products have less revenue than this one"
- It uses **trend analysis** — comparing 1st half sales vs 2nd half sales to compute growth rate.
- **Honest note:** This is a **rule-based classification**, not a trained classifier. It uses IF/THEN rules with data-driven thresholds (percentiles). It is not k-means or a neural network. But rule-based classification is a legitimate analytical approach, especially for small datasets.

### 4. Full data flow

| Step | What happens | Where |
|------|-------------|-------|
| 1 | User opens `/sales` page | Angular `sales-dashboard.component.ts` |
| 2 | Angular calls `GET /analytics/product-performance` | `api.service.ts` → `getProductPerformance()` |
| 3 | NestJS reads sales from MongoDB | `analytics.service.ts` → `callMl()` |
| 4 | NestJS sends to Python | `POST http://localhost:5000/ml/product-performance` |
| 5 | Python groups sales by product, computes growth, classifies | `app.py` → `product_performance()` lines 410-523 |
| 6 | Result returned to Angular | JSON array of product objects |
| 7 | Angular shows product cards with labels, growth %, trend arrows | `sales-dashboard.component.ts` |

### 5. Critical files

| Layer | File | Role |
|-------|------|------|
| Frontend | `frontend/src/app/pages/sales-dashboard.component.ts` | Shows product cards with labels and trend arrows |
| Backend | `backend/src/analytics/analytics.service.ts` | `getProductPerformance()` — lines 73-80 |
| Python ML | `ml-service/app.py` | `product_performance()` — lines 410-523 |

### 6. Critical code references

- `ml-service/app.py` — function `product_performance()` — lines 410-523
- Lines 432-446 — groups all sales by product name, collects revenue, quantity, order count
- Lines 451-453 — finds the **midpoint date** for trend analysis
- Lines 457-459 — computes **P80 and P20 percentiles** using `np.percentile(revenues, 80)`
- Lines 465-474 — computes **growth rate**: `(second_half - first_half) / first_half`
- Lines 477-497 — **classification rules**:
  - `revenue >= P80 and growth > -0.1` → Top Performer
  - `growth > 0.3 and revenue < P80` → Rising Star
  - `growth < -0.2` → Declining
  - `revenue <= P20` → Low Demand
  - Everything else → Stable

### 7. Logic in simple words

1. **Group all sales by product** — add up revenue, quantity, orders for each
2. Find the **middle date** of all sales
3. For each product, split its sales into **first half** and **second half**
4. **Growth** = (second_half_revenue − first_half_revenue) / first_half_revenue
5. Find the **80th percentile** (top 20% threshold) and **20th percentile** (bottom 20% threshold) of all product revenues
6. Apply classification rules:
   - Revenue in top 20% + not declining → **Top Performer**
   - Growth > 30% but not in top 20% → **Rising Star**
   - Growth dropped more than 20% → **Declining**
   - Revenue in bottom 20% → **Low Demand**
   - Otherwise → **Stable**

### 8. Why this is not only "affichage"

The database stores individual sale records. It does NOT store any product label. The Python service:
- ✅ **Aggregates** data per product
- ✅ **Computes growth** by comparing time periods
- ✅ **Computes statistical thresholds** (percentiles via NumPy)
- ✅ **Classifies** each product into a category using data-driven rules
- ✅ **Generates explanations** in plain English

### 9. What I can say to my professor

**Very short:**
> "The system classifies products into categories like Top Performer or Declining based on revenue and growth trends."

**Normal:**
> "We group sales by product, compute each product's total revenue and growth rate — comparing the first half of sales to the second half. We use the 80th and 20th percentile as thresholds, computed with NumPy. Products with high revenue and positive growth are Top Performers. Products with dropping revenue are Declining. This rule-based classification helps users identify which products need attention."

**Technical:**
> "This is a rule-based classification model using statistical thresholds. We compute per-product revenue, order count, and temporal growth by splitting the observation window at the midpoint. Classification boundaries use `np.percentile()` at P80 and P20. Growth rate is computed as percentage change between first-half and second-half revenue. The classification rules combine revenue rank with growth dynamics. For larger datasets, this could evolve into a K-Means clustering approach."

### 10. Memorization box

| | |
|---|---|
| **Input** | All sales records for this user |
| **Processing** | Group by product, compute revenue + growth, apply percentile-based rules |
| **Output** | Per product: label (Top/Rising/Stable/Declining/Low), growth %, explanation |
| **ML type** | Classification (rule-based with statistical thresholds) |
| **Business value** | Shows which products drive revenue and which need attention |

---

---

# Honest Conclusion

## What is real ML, what is analytics, and what is display?

| Feature | Category | Honest assessment |
|---------|---------|-------------------|
| **Revenue Forecast** | ✅ **Real Machine Learning** | Uses scikit-learn LinearRegression. Model learns from data (`fit`), predicts future (`predict`), has R² metric. This is supervised learning. |
| **Stockout Risk** | 🔶 **Analytics + Prediction** | Uses demand estimation formulas. Not a trained model, but does predict a future event (stockout date). A legitimate predictive analytics approach. |
| **Reorder Recommendation** | 🔶 **Analytics + Recommendation** | Uses safety stock formula from supply chain theory. Not trained ML, but a well-justified recommendation approach. |
| **Health Score** | 🔶 **Analytics + Scoring** | Weighted scoring model with feature engineering and NumPy statistics. Similar to credit scoring. Not trained ML. |
| **Product Performance** | 🟡 **Rule-based Classification** | Uses IF/THEN rules with data-driven thresholds (percentiles). Classification is legitimate, but rule-based — not a trained classifier. |
| **KPI cards, charts, tables** | ⬜ **Display / Dashboard** | These just show aggregated data. Not AI. |
| **CSV import, manual entry** | ⬜ **CRUD** | Standard data entry. Not AI. |

### Summary for your professor:

> "Our project has one true machine learning feature (Revenue Forecast using scikit-learn) and four analytics/intelligent features (stockout prediction, reorder recommendation, health scoring, product classification). All of them go beyond simple display — they compute, transform, infer, and generate results that don't exist in the database. The Revenue Forecast is supervised learning. The others use statistical analysis, feature engineering, and rule-based intelligence. All computation happens in a separate Python microservice, keeping the architecture clean and the ML logic isolated."

### The key phrase to remember:

> **"The application doesn't just show data — it thinks about the data and tells you what to do."**
