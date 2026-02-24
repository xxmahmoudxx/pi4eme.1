import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'bi_token';
  private apiBase = 'http://localhost:3000';
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserRole = new BehaviorSubject<string | null>(this.getRoleFromToken());

  constructor(private http: HttpClient) { }

  isLoggedIn$ = this.loggedIn.asObservable();
  currentUserRole$ = this.currentUserRole.asObservable();
  isAdmin$ = this.currentUserRole.pipe(map(role => role === 'Admin'));

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.role;
    } catch {
      return null;
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<{ access_token: string }>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.access_token);
        }),
      );
  }

  /** Call this after receiving a token from any source (face login, etc.) */
  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
    this.loggedIn.next(true);
    this.currentUserRole.next(this.getRoleFromToken());
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn.next(false);
    this.currentUserRole.next(null);
  }

  signup(payload: any) {
    return this.http
      .post<{ access_token: string }>(`${this.apiBase}/auth/signup`, payload)
      .pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.access_token);
          this.loggedIn.next(true);
          this.currentUserRole.next(this.getRoleFromToken());
        })
      );
  }
}
