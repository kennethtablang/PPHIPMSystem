// Password policy — the hard floor mirrors the ASP.NET Identity rules in
// Program.cs (length 8, uppercase, lowercase, digit). The configurable parts
// (min length, special character) come from Settings → System and are fetched
// from the anonymous /systemsettings/password-policy endpoint so unauthenticated
// pages (reset password) get the same inline feedback as the server enforces.

import { useEffect, useState } from 'react';
import { getPasswordPolicy } from '../api/systemSettings';

export const DEFAULT_POLICY = { minLength: 8, requireSpecial: true };

export function passwordHint(policy = DEFAULT_POLICY) {
  const special = policy.requireSpecial ? ', and a special character' : '';
  return `At least ${policy.minLength} characters, including an uppercase letter, a lowercase letter, and a number${special}.`;
}

// Returns an error message string if the password is invalid, or null if it passes.
export function validatePassword(pw, policy = DEFAULT_POLICY) {
  if (!pw || pw.length < policy.minLength) return `Password must be at least ${policy.minLength} characters long.`;
  if (!/[a-z]/.test(pw)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one special character.';
  return null;
}

// Fetch the server policy once per page load; falls back to the defaults if
// the request fails (the server still enforces the real policy either way).
let cachedPolicy = null;

export function usePasswordPolicy() {
  const [policy, setPolicy] = useState(cachedPolicy ?? DEFAULT_POLICY);

  useEffect(() => {
    if (cachedPolicy) return;
    getPasswordPolicy()
      .then(({ data }) => {
        cachedPolicy = { minLength: data.minLength, requireSpecial: data.requireSpecial };
        setPolicy(cachedPolicy);
      })
      .catch(() => {});
  }, []);

  return policy;
}
