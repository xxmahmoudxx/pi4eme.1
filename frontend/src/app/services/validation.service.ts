import { Injectable } from '@angular/core';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  private readonly nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  private readonly phoneRegex = /^[0-9+\-\s()]+$/;
  private readonly alphanumericRegex = /^[a-zA-Z0-9\s\-_]+$/;

  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!this.emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return { valid: errors.length === 0, errors };
  }

  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain special characters (@$!%*?&)');
    }

    return { valid: errors.length === 0, errors };
  }

  validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    const errors: string[] = [];

    if (!name) {
      errors.push(`${fieldName} is required`);
    } else if (!this.nameRegex.test(name)) {
      errors.push(`${fieldName} must only contain letters, spaces, hyphens, and apostrophes`);
    } else if (name.trim().length < 2) {
      errors.push(`${fieldName} must be at least 2 characters long`);
    }

    return { valid: errors.length === 0, errors };
  }

  validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone) {
      errors.push('Phone number is required');
    } else if (!this.phoneRegex.test(phone)) {
      errors.push('Invalid phone number format');
    } else if (phone.replace(/\D/g, '').length < 7) {
      errors.push('Phone number must have at least 7 digits');
    }

    return { valid: errors.length === 0, errors };
  }

  validateField(value: string, type: 'email' | 'password' | 'name' | 'phone' | 'alphanumeric', fieldName?: string): ValidationResult {
    switch (type) {
      case 'email':
        return this.validateEmail(value);
      case 'password':
        return this.validatePassword(value);
      case 'name':
        return this.validateName(value, fieldName);
      case 'phone':
        return this.validatePhone(value);
      case 'alphanumeric':
        return this.validateAlphanumeric(value, fieldName);
      default:
        return { valid: true, errors: [] };
    }
  }

  private validateAlphanumeric(value: string, fieldName: string = 'Field'): ValidationResult {
    const errors: string[] = [];

    if (!value) {
      errors.push(`${fieldName} is required`);
    } else if (!this.alphanumericRegex.test(value)) {
      errors.push(`${fieldName} can only contain letters, numbers, spaces, hyphens, and underscores`);
    }

    return { valid: errors.length === 0, errors };
  }

  validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
    const errors: string[] = [];

    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    return { valid: errors.length === 0, errors };
  }

  getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  }
}
