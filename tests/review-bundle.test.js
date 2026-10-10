import { describe, expect, it, vi } from 'vitest';
import { DataFactory, Store, Writer } from 'n3';

vi.mock('@/modules/utils', () => ({
    getRecordQuads: (iri, graph) => graph.getQuads(iri, null, null, null),
    quadsToTTL: (quads, prefixes) =>
        new Promise((resolve, reject) => {
            const writer = new Writer({ prefixes });
            writer.addQuads(quads);
            writer.end((error, result) =>
                error ? reject(error) : resolve(result)
            );
        }),
    toCURIE: (iri, prefixes) => {
        for (const [prefix, namespace] of Object.entries(prefixes)) {
            if (iri.startsWith(namespace))
                return `${prefix}:${iri.slice(namespace.length)}`;
        }
        return iri;
    },
}));

const { buildReviewBundle, reviewBundleFilename, validateRecordCatalog } =
    await import('../src/modules/review-bundle');

const { namedNode, literal, quad } = DataFactory;
const PID = 'xyzrins:persons/example';
const IRI = 'https://example.test/r/persons/example';
const SITE_COMMIT = 'a'.repeat(40);
const SOURCE_SHA256 = 'b'.repeat(64);
const catalog = {
    format: 'con-static-record-sources',
    records: [
        {
            path: 'profiles/con/metadata/records/XYZPerson/example.yaml',
            pid: PID,
            schema_type: 'xyzri:XYZPerson',
            sha256: SOURCE_SHA256,
        },
    ],
    site_commit: SITE_COMMIT,
    version: 1,
};

describe('static review bundles', () => {
    it('binds selected RDF to its immutable source coordinates', async () => {
        const graph = new Store([
            quad(
                namedNode(IRI),
                namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
                literal('Changed label')
            ),
        ]);
        const bundle = await buildReviewBundle({
            catalog,
            graph,
            prefixes: {
                rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
                xyzrins: 'https://example.test/r/',
            },
            selectedNodes: [{ node_iri: IRI }],
        });

        expect(bundle).toMatchObject({
            format: 'con-shacl-review-bundle',
            site_commit: SITE_COMMIT,
            version: 1,
        });
        expect(bundle.records).toHaveLength(1);
        expect(bundle.records[0]).toMatchObject({
            pid: PID,
            schema_type: 'xyzri:XYZPerson',
            source_path: 'profiles/con/metadata/records/XYZPerson/example.yaml',
            source_sha256: SOURCE_SHA256,
        });
        expect(bundle.records[0].rdf_turtle).toContain('Changed label');
    });

    it('rejects missing, duplicate, and unselected catalog records', async () => {
        expect(() =>
            validateRecordCatalog({ ...catalog, site_commit: 'not-a-commit' })
        ).toThrow(/version 1/);
        expect(() =>
            validateRecordCatalog({
                ...catalog,
                records: [catalog.records[0], catalog.records[0]],
            })
        ).toThrow(/duplicate PID/);
        await expect(
            buildReviewBundle({
                catalog,
                graph: new Store(),
                prefixes: { xyzrins: 'https://example.test/r/' },
                selectedNodes: [],
            })
        ).rejects.toThrow(/Select at least one/);
    });

    it('creates a filesystem-safe deterministic filename', () => {
        expect(reviewBundleFilename([{ pid: PID }])).toBe(
            'con-review-xyzrins-persons-example.json'
        );
    });
});
