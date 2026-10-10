import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import ShaclVueStarter from '../src/components/ShaclVueStarter.vue';

describe('Starter query navigation', () => {
    let app;

    afterEach(() => {
        app?.unmount();
        sessionStorage.clear();
        window.history.replaceState(null, '', '/');
        vi.unstubAllGlobals();
    });

    it('clears disabled tokens when opening the Starter', async () => {
        sessionStorage.setItem('serviceToken', 'saved-token');
        window.history.replaceState(null, '', '/?token=url-token');
        // Keep configuration loading pending while exercising query navigation.
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => {}))
        );
        app = createApp({ ...ShaclVueStarter, render: () => null });
        app.use(createVuetify());
        const component = app.mount(document.createElement('div'));
        component.$.setupState.configVarsMain.useToken = false;

        await component.$.setupState.setViewFromQuery();

        expect(sessionStorage.getItem('serviceToken')).toBeNull();
        expect(window.location.search).toBe('');
    });
});
