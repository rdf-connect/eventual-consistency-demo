import { describe, expect, test } from "vitest";
import { fetchProc } from "../writer";
import { HttpUtilsError } from "../../src/error";

describe("auth", () => {
    test("invalid type", async () => {
        const func = fetchProc("https://example.com", {
            auth: {
                type: "invalid" as "oauth2",
                username: "admin",
                password: "password",
            },
        });

        return expect(func).rejects.toThrow(
            HttpUtilsError.illegalParameters("Unknown auth type: 'invalid'"),
        );
    });
});
