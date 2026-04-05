import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  constructor() { }

  // Utility method for animations if needed
  getSlideInAnimation() {
    return {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }
}
