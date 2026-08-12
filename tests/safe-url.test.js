import { describe, expect, it, vi } from 'vitest';

import { openExternalHTTPURL, safeHTTPURL } from '../src/modules/safe-url';

describe('record-derived external URLs', () => {
    const base = 'https://preview.example/edit/';

    it('rejects executable and data URL schemes', () => {
        expect(safeHTTPURL('javascript:alert(1)', base)).toBeNull();
        expect(
            safeHTTPURL('data:text/html,<script>alert(1)</script>', base)
        ).toBeNull();
        expect(safeHTTPURL('http://[invalid', base)).toBeNull();
    });

    it('allows deliberate relative, HTTP, and HTTPS navigation', () => {
        expect(safeHTTPURL('../record', base)).toBe(
            'https://preview.example/record'
        );
        expect(safeHTTPURL('http://example.test/', base)).toBe(
            'http://example.test/'
        );
        expect(safeHTTPURL('https://example.test/path', base)).toBe(
            'https://example.test/path'
        );
    });

    it('opens a new isolated browsing context', () => {
        const openWindow = vi.fn();
        expect(
            openExternalHTTPURL('https://example.test/', base, openWindow)
        ).toBe(true);
        expect(openWindow).toHaveBeenCalledWith(
            'https://example.test/',
            '_blank',
            'noopener,noreferrer'
        );
        expect(
            openExternalHTTPURL('javascript:alert(1)', base, openWindow)
        ).toBe(false);
        expect(openWindow).toHaveBeenCalledTimes(1);
    });
});
