import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/modules/auth/validators/auth.validator.js';

describe('Auth Validators', () => {
  it('should validate valid registration input', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure@123',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(true);
  });

  it('should reject weak password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Secure@123',
    });
    expect(result.success).toBe(false);
  });

  it('should validate login input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });
});
