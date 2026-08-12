import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { DataFactory } from 'n3';
import { useData } from '../src/composables/useData';

const { namedNode, quad } = DataFactory;
const person = 'https://example.org/alice';

afterEach(() => vi.unstubAllGlobals());

describe('static record data', () => {
    it('resolves existing records without using configured service endpoints', async () => {
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        const data = useData(ref({
            use_service: false,
            service_base_url: 'https://example.org/api/',
            service_endpoints: { 'get-record': 'record?pid={curie}' },
        }));
        data.rdfDS.data.graph.addQuad(quad(
            namedNode(person),
            namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            namedNode('https://example.org/Person'),
        ));
        const result = await data.fetchFromService('get-record', person, {});
        expect(result.url[0].records).toEqual([person]);
        const missing = await data.fetchFromService('get-record', 'https://example.org/missing', {});
        expect(missing.url[0].records).toEqual([]);
        expect(data.hasUnfetchedPages('https://example.org/Person')).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });
});
