import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose an observable for dark mode', (done) => {
    service.isDarkMode$.subscribe((value) => {
      expect(typeof value).toBe('boolean');
      done();
    });
  });

  it('toggleTheme should flip the value of isDarkMode', () => {
    const before = service.isDarkMode();
    service.toggleTheme();
    expect(service.isDarkMode()).toBe(!before);
  });

  it('setColorTheme should ignore unknown theme names', () => {
    let received = '';
    service.colorTheme$.subscribe((value) => (received = value));
    const previous = received;
    service.setColorTheme('not-a-real-theme');
    expect(received).toBe(previous);
  });

  it('setColorTheme should accept a known theme', () => {
    service.setColorTheme('emerald');
    expect(localStorage.getItem('color-theme')).toBe('emerald');
  });
});
