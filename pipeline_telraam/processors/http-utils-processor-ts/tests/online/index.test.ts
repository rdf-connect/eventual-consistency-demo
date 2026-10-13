import { describe, test, expect } from "vitest";
import { HttpUtilsError } from "../../src/error";
import { fetchProc, output } from "../writer";

describe("Real world datasets", () => {
    // Retrieve RINF credentials.
    const rinfUsername = process.env["RINF_USERNAME"];
    const rinfPassword = process.env["RINF_PASSWORD"];
    const rinfTest = rinfUsername && rinfPassword ? test : test.skip;

    rinfTest(
        "RINF - success",
        async () => {
            // Execute the function.
            const { proc, reader } = await fetchProc(
                "https://rinf.era.europa.eu/api/DatasetImports",
                {
                    auth: {
                        type: "oauth2",
                        username: rinfUsername!,
                        password: rinfPassword!,
                        endpoint: "https://rinf.era.europa.eu/api/token",
                    },
                },
            );
            // Output which we'll check for correctness.
            const out = output(reader);

            await proc.produce();

            const json = JSON.parse(await out);
            expect(json["@odata.context"]).toEqual(
                "https://rinf.era.europa.eu/API/$metadata#DatasetImports",
            );
        },
        10 * 1000,
    );

    rinfTest(
        "RINF - missing credentials",
        async () => {
            const { proc } = await fetchProc(
                "https://rinf.era.europa.eu/api/DatasetImports",
            );

            return expect(proc.produce()).rejects.toThrow(
                HttpUtilsError.unauthorizedError(),
            );
        },
        10 * 1000,
    );

    rinfTest(
        "RINF - invalid credentials",
        async () => {
            const { proc } = await fetchProc(
                "https://rinf.era.europa.eu/api/DatasetImports",
                {
                    auth: {
                        type: "oauth2",
                        username: "invalid",
                        password: "invalid",
                        endpoint: "https://rinf.era.europa.eu/api/token",
                    },
                },
            );

            return expect(proc.produce()).rejects.toThrow(
                HttpUtilsError.oAuth2TokenError(400),
            );
        },
        10 * 1000,
    );

    // Retrieve WoRMS credentials.
    const wormsUsername = process.env["WoRMS_USERNAME"];
    const wormsPassword = process.env["WoRMS_PASSWORD"];
    const wormsTest = wormsUsername && wormsPassword ? test : test.skip;

    wormsTest(
        "WoRMS - success",
        async () => {
            const { proc } = await fetchProc(
                "https://www.marinespecies.org/download/",
                {
                    auth: {
                        type: "basic",
                        username: wormsUsername!,
                        password: wormsPassword!,
                    },
                },
            );

            return expect(proc.produce()).resolves.toBeUndefined();
        },
        10 * 1000,
    );

    wormsTest(
        "WoRMS - missing credentials",
        async () => {
            const { proc } = await fetchProc(
                "https://www.marinespecies.org/download/",
            );

            return expect(proc.produce()).rejects.toThrow(
                HttpUtilsError.unauthorizedError(),
            );
        },
        10 * 1000,
    );

    wormsTest(
        "WoRMS - invalid credentials",
        async () => {
            const { proc } = await fetchProc(
                "https://www.marinespecies.org/download/",
                {
                    auth: {
                        type: "basic",
                        username: "invalid",
                        password: "invalid",
                    },
                },
            );

            return expect(proc.produce()).rejects.toThrow(
                HttpUtilsError.credentialIssue(),
            );
        },
        10 * 1000,
    );

    // Check if BLUE_BIKE is defined.
    const blueBike = process.env["BLUE_BIKE"];
    const blueBikeTest = blueBike === "true" ? test : test.skip;

    blueBikeTest("BlueBike - success", async () => {
        const { proc, reader } = await fetchProc(
            "https://api.blue-bike.be/pub/location",
        );
        const out = output(reader);

        await expect(proc.produce()).resolves.toBeUndefined();
        expect(JSON.parse(await out).length).toBeGreaterThan(100);
    });

    test(
        "Swedish - success",
        async () => {
            const { proc, reader } = await fetchProc(
                "https://admin.dataportal.se/all.rdf",
            );
            const out = output(reader);

            await expect(proc.produce()).resolves.toBeUndefined();
            console.log(
                `Size of incoming data: ${(await out).length} characters.`,
            );
        },
        60 * 1000,
    );
});
