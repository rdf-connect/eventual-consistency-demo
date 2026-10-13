import { describe, expect, test } from "vitest";
import { ProcHelper } from "@rdfc/js-runner/lib/testUtils";
import * as path from "path";

import { SparqlProcessor } from "../src";

describe("SPARQL processor tests", async () => {
    test("rdfc:SparqlProcessor is properly defined", async () => {
        const processorConfig = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.

        <http://example.com/ns#processor> a rdfc:SparqlProcessor;
          rdfc:reader <jr>;
          rdfc:writer <jw>;
          rdfc:query "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }".
        `;

        const helper = new ProcHelper<SparqlProcessor>();
        await helper.importFile(path.resolve("./processor.ttl"));
        await helper.importInline(
            path.resolve("pipeline.ttl"),
            processorConfig,
        );

        const config = helper.getConfig("SparqlProcessor");
        expect(config.location).toBeDefined();
        expect(config.file).toBeDefined();
        expect(config.clazz).toEqual("SparqlProcessor");

        const processor = await helper.getProcessor(
            "http://example.com/ns#processor",
        );

        expect(processor.reader.constructor.name).toBe("ReaderInstance");
        expect(processor.writer?.constructor.name).toBe("WriterInstance");
        expect(processor.query).toBe(
            "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
        );
    });
});
