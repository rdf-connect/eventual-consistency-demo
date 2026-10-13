import { describe, expect, test } from "vitest";
import { SparqlProcessor } from "../src";
import { channel, createRunner } from "@rdfc/js-runner/lib/testUtils";
import { FullProc, Reader } from "@rdfc/js-runner";
import { createLogger, transports } from "winston";

const logger = createLogger({
    transports: new transports.Console({
        level: process.env["DEBUG"] || "info",
    }),
});

const query = `
PREFIX ex: <http://example.org/>
CONSTRUCT { ?s ex:label ?o } WHERE { ?s ex:name ?o }
`;

async function setup() {
    const runner = createRunner();
    const [inputWriter, inputReader] = channel(runner, "input");
    const [outputWriter, outputReader] = channel(runner, "output");

    const proc = <FullProc<SparqlProcessor>>new SparqlProcessor(
        {
            reader: inputReader,
            writer: outputWriter,
            query,
        },
        logger,
    );
    await proc.init();

    return { proc, inputWriter, outputReader };
}

function collect(reader: Reader): Promise<string[]> {
    return (async () => {
        const collected: string[] = [];
        for await (const msg of reader.strings()) {
            collected.push(msg);
        }
        return collected;
    })();
}

describe("Functional tests for the SPARQL processor", () => {
    test("It applies the CONSTRUCT query to every incoming message", async () => {
        const { proc, inputWriter, outputReader } = await setup();

        // Read messages in the background
        const readPromise = collect(outputReader);
        const prom = proc.transform();

        await inputWriter.string(
            `<http://example.org/a> <http://example.org/name> "A" .
<http://example.org/a> <http://example.org/other> "ignored" .`,
        );
        await inputWriter.string(
            `<http://example.org/b> <http://example.org/name> "B" .`,
        );
        await inputWriter.close();

        // The processor closes its writer once the input is closed,
        // which ends the output iteration.
        await prom;
        const collected = await readPromise;

        expect(collected).toHaveLength(2);
        expect(collected[0].trim()).toBe(
            '<http://example.org/a> <http://example.org/label> "A" .',
        );
        expect(collected[1].trim()).toBe(
            '<http://example.org/b> <http://example.org/label> "B" .',
        );
    });

    test("It closes the writer when the input closes without messages", async () => {
        const { proc, inputWriter, outputReader } = await setup();

        const readPromise = collect(outputReader);
        const prom = proc.transform();

        await inputWriter.close();
        await prom;
        expect(await readPromise).toEqual([]);
    });
});
