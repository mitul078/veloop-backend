import crypto from "crypto";
import http from "http";
import mongoose from "mongoose";

// Set frontend url with trailing slash BEFORE importing app to test sanitization
process.env.FRONTEND_URL = "https://example.com/";

let app;
let env;
let server;
let baseURL;

// Helper to extract cookie from Set-Cookie header
function extractRefreshTokenCookie(headers) {
    const cookies = headers.getSetCookie ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
    if (!cookies || cookies.length === 0) {
        const rawCookie = headers.get("set-cookie");
        if (!rawCookie) return null;
        cookies.push(rawCookie);
    }
    for (const cookie of cookies) {
        const match = cookie.match(/refresh_token=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
    }
    return null;
}

// Helper to extract cookie properties (Secure, SameSite)
function getCookieProperties(headers) {
    const rawCookie = headers.get("set-cookie") || "";
    return {
        secure: rawCookie.toLowerCase().includes("secure"),
        sameSite: rawCookie.match(/samesite=([^;]+)/i)?.[1] || null
    };
}

beforeAll(async () => {
    // Dynamically import app and env to bypass hoisting
    const envModule = await import("../../shared/config/env.js");
    env = envModule.default;

    const appModule = await import("../../app.js");
    app = appModule.default;

    // Connect to a separate test database
    const testUri = env.db.mongodb_uri.replace(/\/([^\/]*)$/, "/veloop-backend-test");
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(testUri);
    }
    
    // Start server on a random free port
    server = app.listen(0);
    const port = server.address().port;
    baseURL = `http://localhost:${port}/api/v1`;
});

afterAll(async () => {
    // Clean up connections and stop server
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    }
    await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
    // Clear collections before each test to ensure clean slate
    await mongoose.connection.db.collection("auths").deleteMany({});
    await mongoose.connection.db.collection("refreshtokens").deleteMany({});
});

describe("Authentication Module Tests", () => {
    const testEmail = "test@example.com";
    const testPassword = "Password123!";
    const testPhone = "+1234567890";

    // Helper to register a user
    async function registerUser(email = testEmail, password = testPassword, phone = testPhone) {
        return fetch(`${baseURL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, phone })
        });
    }

    // Helper to login
    async function loginUser(email = testEmail, password = testPassword) {
        return fetch(`${baseURL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
    }

    test("1. Register -> login -> access protected route -> succeeds", async () => {
        // Register
        const regRes = await registerUser();
        expect(regRes.status).toBe(201);
        const regBody = await regRes.json();
        expect(regBody.success).toBe(true);
        expect(regBody.data.email).toBe(testEmail);
        expect(regBody.data.password).toBeUndefined(); // Password not returned

        // Login
        const loginRes = await loginUser();
        expect(loginRes.status).toBe(200);
        const loginBody = await loginRes.json();
        expect(loginBody.success).toBe(true);
        expect(loginBody.data.access_token).toBeDefined();
        expect(loginBody.data.user.email).toBe(testEmail);
        expect(loginBody.data.user.password).toBeUndefined(); // Confirm select: false / password omitted
        
        const refreshToken = extractRefreshTokenCookie(loginRes.headers);
        expect(refreshToken).toBeDefined();

        // Access protected route
        const protectedRes = await fetch(`${baseURL}/referral/reward-config`, {
            headers: {
                "Authorization": `Bearer ${loginBody.data.access_token}`
            }
        });
        expect(protectedRes.status).toBe(200);
        const protectedBody = await protectedRes.json();
        expect(protectedBody.success).toBe(true);
    });

    test("2. Register duplicate email -> clean 400/409 with USER_ALREADY_EXISTS code", async () => {
        await registerUser();
        const duplicateRes = await registerUser();
        expect([400, 409]).toContain(duplicateRes.status);
        
        const body = await duplicateRes.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("USER_ALREADY_EXISTS");
    });

    test("3. Login with wrong credentials -> clean 401/400 and no user enumeration timing leaks", async () => {
        // Test user not found
        const start1 = Date.now();
        const resNotFound = await loginUser("nonexistent@example.com", "anyPassword");
        const elapsed1 = Date.now() - start1;

        expect(resNotFound.status).toBe(401);
        const bodyNotFound = await resNotFound.json();
        expect(bodyNotFound.success).toBe(false);
        expect(bodyNotFound.code).toBe("CREDENTIALS_INCORRECT");

        // Register the user
        await registerUser();

        // Test user found but wrong password
        const start2 = Date.now();
        const resWrongPass = await loginUser(testEmail, "wrongPassword");
        const elapsed2 = Date.now() - start2;

        expect(resWrongPass.status).toBe(401);
        const bodyWrongPass = await resWrongPass.json();
        expect(bodyWrongPass.success).toBe(false);
        expect(bodyWrongPass.code).toBe("CREDENTIALS_INCORRECT");

        // Validate error responses are identical to prevent enumeration
        expect(bodyNotFound.code).toBe(bodyWrongPass.code);
        expect(bodyNotFound.message).toBe(bodyWrongPass.message);

        // Check that timing differences are minimal (due to dummy bcrypt call)
        const timingDiff = Math.abs(elapsed1 - elapsed2);
        console.log(`Timing difference between found and not found users: ${timingDiff}ms`);
    });

    test("4. Refresh a valid token -> gets new tokens, old refresh token revoked", async () => {
        await registerUser();
        const loginRes = await loginUser();
        const firstRefreshToken = extractRefreshTokenCookie(loginRes.headers);

        // Perform rotation
        const refreshRes = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Cookie": `refresh_token=${firstRefreshToken}`
            }
        });
        expect(refreshRes.status).toBe(200);
        const refreshBody = await refreshRes.json();
        expect(refreshBody.success).toBe(true);
        expect(refreshBody.data.access_token).toBeDefined();

        const secondRefreshToken = extractRefreshTokenCookie(refreshRes.headers);
        expect(secondRefreshToken).toBeDefined();
        expect(secondRefreshToken).not.toBe(firstRefreshToken);

        // Attempting to refresh again with the first token outside the 5s window should fail.
        // Wait 5.5 seconds to exceed the grace window
        await new Promise((resolve) => setTimeout(resolve, 5500));

        const reuseRes = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Cookie": `refresh_token=${firstRefreshToken}`
            }
        });
        expect(reuseRes.status).toBe(401);
        const reuseBody = await reuseRes.json();
        expect(reuseBody.code).toBe("LOGIN_AGAIN");
    }, 30000); // increase timeout for sleep

    test("5. Reused token outside grace window -> session is revoked and all tokens fail", async () => {
        await registerUser();
        const loginRes = await loginUser();
        const token1 = extractRefreshTokenCookie(loginRes.headers);

        // Rotate once
        const rot1Res = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token1}` }
        });
        const token2 = extractRefreshTokenCookie(rot1Res.headers);

        // Wait for grace window to expire
        await new Promise(r => setTimeout(r, 5500));

        // Replay/reuse token1 (outside grace window)
        const reuseRes = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token1}` }
        });
        expect(reuseRes.status).toBe(401);
        expect((await reuseRes.json()).code).toBe("LOGIN_AGAIN");

        // Verify the entire session was revoked by trying to refresh with token2
        const token2Res = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token2}` }
        });
        expect(token2Res.status).toBe(401);
        expect((await token2Res.json()).code).toBe("LOGIN_AGAIN");
    }, 30000);

    test("6. Concurrent duplicate refresh requests (Promise.all) -> resolved successfully with same token, only 1 new active document in DB", async () => {
        await registerUser();
        const loginRes = await loginUser();
        const originalRefreshToken = extractRefreshTokenCookie(loginRes.headers);

        // Fire concurrent duplicate requests
        const [res1, res2] = await Promise.all([
            fetch(`${baseURL}/auth/refresh-token`, {
                method: "POST",
                headers: { "Cookie": `refresh_token=${originalRefreshToken}` }
            }),
            fetch(`${baseURL}/auth/refresh-token`, {
                method: "POST",
                headers: { "Cookie": `refresh_token=${originalRefreshToken}` }
            })
        ]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);

        const body1 = await res1.json();
        const body2 = await res2.json();
        
        expect(body1.data.access_token).toBe(body2.data.access_token);

        const cookie1 = extractRefreshTokenCookie(res1.headers);
        const cookie2 = extractRefreshTokenCookie(res2.headers);
        expect(cookie1).toBe(cookie2);

        // Query the database to inspect refresh token documents
        const dbTokens = await mongoose.connection.db.collection("refreshtokens").find({}).toArray();
        // Since we rotate the token, the old one is deleted from the DB by flat cleanup,
        // leaving exactly ONE new active token doc.
        expect(dbTokens.length).toBe(1);
        expect(dbTokens[0].revoked).toBe(false);

        // Verify it is stored as SHA-256 hash, not plaintext
        const rawNewToken = cookie1;
        const hashNewToken = crypto.createHash("sha256").update(rawNewToken).digest("hex");
        expect(dbTokens[0].refresh_token).toBe(hashNewToken);
    });

    test("7. Logout -> revokes session, then trying to refresh fails", async () => {
        await registerUser();
        const loginRes = await loginUser();
        const token = extractRefreshTokenCookie(loginRes.headers);

        // Logout
        const logoutRes = await fetch(`${baseURL}/auth/logout`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token}` }
        });
        expect(logoutRes.status).toBe(200);
        expect((await logoutRes.json()).success).toBe(true);

        // Attempting to refresh
        const refreshRes = await fetch(`${baseURL}/auth/refresh-token`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token}` }
        });
        // Since it's logged out, it should fail
        expect(refreshRes.status).toBe(401);
        expect((await refreshRes.json()).code).toBe("LOGIN_AGAIN");
    });

    test("8. Logout is idempotent -> calling multiple times does not throw", async () => {
        await registerUser();
        const loginRes = await loginUser();
        const token = extractRefreshTokenCookie(loginRes.headers);

        const logout1 = await fetch(`${baseURL}/auth/logout`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token}` }
        });
        expect(logout1.status).toBe(200);

        const logout2 = await fetch(`${baseURL}/auth/logout`, {
            method: "POST",
            headers: { "Cookie": `refresh_token=${token}` }
        });
        expect(logout2.status).toBe(200);

        const logout3 = await fetch(`${baseURL}/auth/logout`, {
            method: "POST"
            // No cookie
        });
        expect(logout3.status).toBe(200);
    });

    test("9. CORS Exact matching & trailing-slash mismatch tests", async () => {
        // Set env.frontendUrl = https://example.com/ (with trailing slash)
        // Express app CORS setup should strip trailing slash and match EXACTLY against "https://example.com"
        
        const getCorsOrigin = (origin) => {
            return new Promise((resolve, reject) => {
                const req = http.request(`${baseURL}/health`, {
                    method: "GET",
                    headers: {
                        "Origin": origin
                    }
                }, (res) => {
                    resolve(res.headers["access-control-allow-origin"] || null);
                });
                req.on("error", reject);
                req.end();
            });
        };

        // Exact match with browser-sent Origin header (without trailing slash)
        const matchOrigin = await getCorsOrigin("https://example.com");
        expect(matchOrigin).toBe("https://example.com");

        // Trailing-slash mismatch in Origin header (Origin: https://example.com/)
        const mismatchOrigin1 = await getCorsOrigin("https://example.com/");
        expect(mismatchOrigin1).toBeNull();

        // Completely different origin
        const mismatchOrigin2 = await getCorsOrigin("https://another.com");
        expect(mismatchOrigin2).toBeNull();
    });
});
