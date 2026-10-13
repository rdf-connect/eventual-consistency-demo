import { expect, test, describe } from "vitest";
import { ProcHelper } from "@rdfc/js-runner/lib/testUtils";
import { resolve } from "path";
import { HttpFetch } from "../src";

describe("processor", () => {
    const pipeline = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.

        <http://example.com/ns#processor> a rdfc:HttpFetch;
            rdfc:url "http://example.com";
            rdfc:writer <jw>.
    `;

    test("is defined", async () => {
        const helper = new ProcHelper<HttpFetch>();
        await helper.importFile(resolve("./processors.ttl"));

        const config = helper.getConfig("HttpFetch");

        expect(config.location).toBeDefined();
        expect(config.file).toBeDefined();
        expect(config.clazz).toEqual("HttpFetch");
    });

    test("definition", async () => {
        const helper = new ProcHelper<HttpFetch>();
        await helper.importFile(resolve("./processors.ttl"));
        await helper.importInline(resolve("./pipeline.ttl"), pipeline);

        helper.getConfig("HttpFetch");
        const proc = await helper.getProcessor(
            "http://example.com/ns#processor",
        );

        // URL must be set.
        expect(proc.url).toEqual(["http://example.com"]);

        // Writer must be valid.
        expect(proc.writer.constructor.name).toBe("WriterInstance");

        // No other options are given.
        expect(proc.options).toBeUndefined();

        // The defaults are filled in by the processor itself.
        await proc.init();
    });
});
