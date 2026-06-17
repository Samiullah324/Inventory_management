import { describe, expect, it } from 'vitest';
import { escapeHtml, sanitizeErrorMessage, sanitizePayload, sanitizeTextInput } from '../utils/security';

describe('security utils', () => {
  it('sanitizes text input control characters', () => {
    expect(sanitizeTextInput('  hello\x00world  ')).toBe('helloworld');
  });

  it('escapes HTML in rendered values', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('sanitizes API error messages', () => {
    expect(sanitizeErrorMessage('<b>bad</b> request')).toBe('&lt;b&gt;bad&lt;/b&gt; request');
  });

  it('sanitizes nested payloads before submit', () => {
    expect(
      sanitizePayload({ name: ' Widget ', notes: 'ok\x08' }),
    ).toEqual({ name: 'Widget', notes: 'ok' });
  });
});
