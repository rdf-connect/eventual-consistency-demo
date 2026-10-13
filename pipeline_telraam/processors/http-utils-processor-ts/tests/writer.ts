import { FullProc, Reader } from "@rdfc/js-runner";
import { channel, createRunner } from "@rdfc/js-runner/lib/testUtils";
import { createLogger, transports } from "winston";
import { HttpFetch } from "../src";

export const logger = createLogger({
    transports: new transports.Console({
        level: process.env["DEBUG"] || "info",
    }),
});

type Options = ConstructorParameters<typeof HttpFetch>[0]["options"];

/**
 * Builds and initializes an `HttpFetch` processor whose writer is backed by a
 * test runner channel. Rejects if `init()` rejects (e.g. invalid options).
 * Replaces the RDF-Connect v1 `httpFetch(url, new SimpleStream(), options)`.
 */
export async function fetchProc(
    url: string | string[],
    options: Options = {},
): Promise<{ proc: FullProc<HttpFetch>; reader: Reader }> {
    const runner = createRunner();
    const [writer, reader] = channel(runner, "output");
    const proc = <FullProc<HttpFetch>>new HttpFetch(
        // The processor does not read in GET mode; the reader is unused.
        { url, writer, options, reader: <Reader>(<unknown>undefined) },
        logger,
    );
    await proc.init();
    return { proc, reader };
}

/**
 * Collects all string messages written to the channel and resolves with
 * their concatenation once the writer closes. Replaces the v1 SimpleStream
 * `.data(...).on("end", ...)` helper. Must be called before the processor
 * starts writing.
 */
export function output(reader: Reader): Promise<string> {
    return (async () => {
        let out = "";
        for await (const msg of reader.strings()) {
            out += msg;
        }
        return out;
    })();
}
