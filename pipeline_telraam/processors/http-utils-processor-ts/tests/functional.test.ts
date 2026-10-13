import {
    describe,
    expect,
    test,
    beforeEach,
    beforeAll,
    afterAll,
} from "vitest";
import { HttpUtilsError } from "../src/error";
import { Fetch } from "./fetch";
import { fetchProc, output } from "./writer";

const mockFetch = new Fetch();

beforeAll(() => {
    mockFetch.default();
});

beforeEach(() => {
    mockFetch.clear();
    mockFetch.default();
});

afterAll(() => {
    mockFetch.restore();
});

describe("httpFetch - sanity checks", () => {
    test("status code - malformed range", async () => {
        const func = fetchProc("https://example.com", {
            acceptStatusCodes: ["2oo-3oo"],
        });

        return expect(func).rejects.toThrow(
            HttpUtilsError.invalidStatusCodeRange(),
        );
    });

    test("headers - malformed", async () => {
        const func = fetchProc("https://example.com", {
            headers: ["a: b", "c"],
        });

        return expect(func).rejects.toThrow(HttpUtilsError.invalidHeaders());
    });

    test("empty body - illegal head method", async () => {
        const func = fetchProc("https://example.com", {
            method: "HEAD",
            bodyCanBeEmpty: false,
        });

        return expect(func).rejects.toThrow(
            HttpUtilsError.illegalParameters(
                "Cannot use HEAD method with bodyCanBeEmpty set to false",
            ),
        );
    });
});

describe("httpFetch - runtime", () => {
    test("status code - unsuccessful default", async () => {
        mockFetch.set({ status: 500 });

        const { proc } = await fetchProc("https://example.com");

        return expect(proc.produce()).rejects.toThrow(
            HttpUtilsError.statusCodeNotAccepted(500),
        );
    });

    test("status code - unsuccessful overwritten", async () => {
        const { proc } = await fetchProc("https://example.com", {
            acceptStatusCodes: ["201"],
        });

        return expect(proc.produce()).rejects.toThrow(
            HttpUtilsError.statusCodeNotAccepted(200),
        );
    });

    test("status code - successful range", async () => {
        mockFetch.set({ status: 501 });

        const { proc } = await fetchProc("https://example.com", {
            acceptStatusCodes: ["500-502"],
        });

        await proc.produce();
    });

    test("status code - successful single", async () => {
        mockFetch.set({ status: 500 });

        const { proc } = await fetchProc("https://example.com", {
            acceptStatusCodes: ["500"],
        });

        await proc.produce();
    });

    test("headers - successful", async () => {
        const { proc } = await fetchProc("https://example.com", {
            headers: ["Content-Type: text/plain", "Accept: text/plain"],
        });

        await proc.produce();

        const req = mockFetch.getArgs()[0]! as Request;
        expect(req).toBeDefined();

        // Check varia.
        expect(req.method).toEqual("GET");

        // Check headers.
        expect(req.headers.get("content-type")).toEqual("text/plain");
        expect(req.headers.get("accept")).toEqual("text/plain");
    });

    test("empty body - error", async () => {
        mockFetch.set({ nullBody: true });

        const { proc } = await fetchProc("https://example.com", {
            bodyCanBeEmpty: false,
        });

        return expect(proc.produce()).rejects.toThrow(
            HttpUtilsError.noBodyInResponse(),
        );
    });

    test("timeout - successful", async () => {
        mockFetch.set({ timeout: 100 });

        const { proc } = await fetchProc("https://example.com", {
            timeOutMilliseconds: 500,
        });

        await proc.produce();
    });

    test("timeout - exceeded", async () => {
        mockFetch.set({ timeout: 500 });

        const { proc } = await fetchProc("https://example.com", {
            timeOutMilliseconds: 100,
        });

        return expect(proc.produce()).rejects.toThrow(
            HttpUtilsError.timeOutError(100),
        );
    });
});

describe("httpFetch - output", () => {
    test("body is written and the writer is closed by default", async () => {
        const { proc, reader } = await fetchProc("https://example.com");
        // Resolves only once the writer is closed (closeOnEnd defaults to true).
        const out = output(reader);

        await proc.produce();

        expect(await out).toEqual("Hello, World!");
    });

    test("body is written as buffer", async () => {
        const { proc, reader } = await fetchProc("https://example.com", {
            outputAsBuffer: true,
        });
        const out = (async () => {
            const chunks: Uint8Array[] = [];
            for await (const chunk of reader.buffers()) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks).toString();
        })();

        await proc.produce();

        expect(await out).toEqual("Hello, World!");
    });
});
