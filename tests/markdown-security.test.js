// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
    renderMarkdownSafely,
    sanitizeRenderedHTML,
} from '../src/modules/markdown';

describe('Markdown preview security', () => {
    it('keeps ordinary formatting while removing executable markup', () => {
        const rendered = renderMarkdownSafely('**safe**');
        const sanitized = sanitizeRenderedHTML(
            '<p>safe</p><img src="x" onerror="alert(1)">' +
                '<a href="javascript:alert(1)">unsafe</a>'
        );

        expect(rendered).toContain('<strong>safe</strong>');
        expect(sanitized).toContain('<p>safe</p>');
        expect(sanitized).not.toMatch(/<script|onerror|href=["']javascript:/i);
    });
});
