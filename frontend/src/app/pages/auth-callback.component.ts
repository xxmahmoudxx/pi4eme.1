import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [],
  template: `<p>Logging in...</p>`,
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    console.log('Token received:', token); // ← add this
    if (token) {
      localStorage.setItem('bi_token', token);
      window.location.href = 'sales';
    } else {
      this.router.navigate(['/login']);
    }
  }
}