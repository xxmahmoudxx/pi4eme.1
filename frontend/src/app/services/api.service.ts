import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiBase = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  // ── Purchases ────────────────────────────────────────────────
  uploadPurchases(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiBase}/purchases/upload`, formData);
  }

  createPurchase(data: any) {
    return this.http.post<any>(`${this.apiBase}/purchases`, data);
  }

  getPurchases() {
    return this.http.get<any[]>(`${this.apiBase}/purchases/list`);
  }

  getPurchaseKpis() {
    return this.http.get<any>(`${this.apiBase}/purchases/kpis`);
  }

  getPurchasesOverTime(interval: 'day' | 'month' = 'day') {
    return this.http.get<any[]>(`${this.apiBase}/purchases/over-time?interval=${interval}`);
  }

  getPurchasesBySupplier() {
    return this.http.get<any[]>(`${this.apiBase}/purchases/by-supplier`);
  }

  getPurchasesByCategory() {
    return this.http.get<any[]>(`${this.apiBase}/purchases/by-category`);
  }

  deletePurchase(id: string) {
    return this.http.delete(`${this.apiBase}/purchases/${id}`);
  }

  // ── Sales ────────────────────────────────────────────────────
  uploadSales(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiBase}/sales/upload`, formData);
  }

  createSale(data: any) {
    return this.http.post<any>(`${this.apiBase}/sales`, data);
  }

  getSales() {
    return this.http.get<any[]>(`${this.apiBase}/sales/list`);
  }

  getSaleKpis() {
    return this.http.get<any>(`${this.apiBase}/sales/kpis`);
  }

  getRevenueOverTime(interval: 'day' | 'month' = 'day') {
    return this.http.get<any[]>(`${this.apiBase}/sales/revenue-over-time?interval=${interval}`);
  }

  getRevenueByProduct() {
    return this.http.get<any[]>(`${this.apiBase}/sales/revenue-by-product`);
  }

  getRevenueByCustomer() {
    return this.http.get<any[]>(`${this.apiBase}/sales/revenue-by-customer`);
  }

  deleteSale(id: string) {
    return this.http.delete(`${this.apiBase}/sales/${id}`);
  }

  // ── Analytics / AI ──────────────────────────────────────────
  getStockoutRisks() {
    return this.http.get<any[]>(`${this.apiBase}/analytics/stockout-risks`);
  }

  getHealthScore() {
    return this.http.get<any>(`${this.apiBase}/analytics/health-score`);
  }

  getSalesForecast() {
    return this.http.get<any>(`${this.apiBase}/analytics/sales-forecast`);
  }

  getProductPerformance() {
    return this.http.get<any[]>(`${this.apiBase}/analytics/product-performance`);
  }

  // ── Stock / Inventory ────────────────────────────────────────
  getStock() {
    return this.http.get<any[]>(`${this.apiBase}/inventory/stock`);
  }

  getInventoryAlerts() {
    return this.http.get<any[]>(`${this.apiBase}/inventory/alerts`);
  }

  // ── Admin ────────────────────────────────────────────────────
  getAllUsers() {
    return this.http.get<any[]>(`${this.apiBase}/users`);
  }

  updateUserStatus(userId: string, status: 'active' | 'inactive') {
    return this.http.patch(`${this.apiBase}/users/${userId}/status`, { status });
  }

  deleteUser(userId: string) {
    return this.http.delete(`${this.apiBase}/users/${userId}`);
  }
}
