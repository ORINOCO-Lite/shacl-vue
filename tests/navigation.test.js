import { describe, expect, it, vi } from 'vitest';
import { useNavigation } from '../src/composables/useNavigation';

vi.mock('../src/modules/utils', () => ({
    findObjectByKey: () => null,
    getPidQuad: () => ({ object: { value: 'example:Person' } }),
    includeClass: () => true,
    includePriorityClass: () => false,
    toCURIE: (value) => value,
    toIRI: (value) => value,
}));

describe('static record navigation', () => {
    it.each(['', '&sh%3ANodeShape=example%3APerson'])(
        'opens a local record without service requests (%s)',
        async (shape) => {
            window.history.replaceState(null, '', '/edit/?pid=example%3Aalice&edit=true&token=discard-me' + shape);
            const edit = vi.fn();
            const fetch = vi.fn();
            const setToken = vi.fn();
            const clearToken = vi.fn();
            const navigation = useNavigation(
                vi.fn(), {}, { useService: false, useToken: false, noEditClasses: [] },
                edit, fetch, { value: [] }, { data: { graph: {} } },
                { value: '' }, { value: [] }, vi.fn(), setToken, clearToken,
                { data: { nodeShapes: { 'example:Person': {} } } }, { value: '' },
            );
            await navigation.setViewFromQuery();
            expect(edit).toHaveBeenCalledWith(expect.objectContaining({ value: 'example:alice' }));
            expect(fetch).not.toHaveBeenCalled();
            expect(setToken).not.toHaveBeenCalled();
            expect(clearToken).toHaveBeenCalledOnce();
            expect(window.location.search).not.toContain('token');
        },
    );
});
