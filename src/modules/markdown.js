import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
    breaks: true,
    highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (_) {
                // Fall back to automatic language detection.
            }
        }
        return hljs.highlightAuto(code).value;
    },
});

export function normalizeMarkdownNewlines(text) {
    return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

export function sanitizeRenderedHTML(raw) {
    return DOMPurify.sanitize(raw, {
        USE_PROFILES: { html: true },
    });
}

export function renderMarkdownSafely(text) {
    const raw = markdown.render(normalizeMarkdownNewlines(text || ''));
    return sanitizeRenderedHTML(raw);
}
