
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

let server;
let win;
let oauthServer = null;

// ============================================================
// GOOGLE DESKTOP OAUTH
// Replace this with your REAL Google Desktop OAuth Client ID.
// Do NOT put your Client Secret here.
// ============================================================
const GOOGLE_CREDENTIALS_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "google-credentials.json")
    : path.join(__dirname, "google-credentials.json");

const GOOGLE_CREDENTIALS = JSON.parse(
    fs.readFileSync(GOOGLE_CREDENTIALS_PATH, "utf8")
);

const GOOGLE_INSTALLED = GOOGLE_CREDENTIALS.installed;

const GOOGLE_CLIENT_ID = GOOGLE_INSTALLED.client_id;
const GOOGLE_CLIENT_SECRET = GOOGLE_INSTALLED.client_secret;


function base64Url(buffer) {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}


function createPKCE() {
    const verifier = base64Url(crypto.randomBytes(64));

    const challenge = base64Url(
        crypto
            .createHash("sha256")
            .update(verifier)
            .digest()
    );

    return {
        verifier,
        challenge
    };
}


function createState() {
    return base64Url(crypto.randomBytes(32));
}


// ============================================================
// GOOGLE SIGN-IN
// ============================================================
async function googleSignIn() {

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured.");
}

    const { verifier, challenge } = createPKCE();
    const state = createState();

    return new Promise((resolve, reject) => {

        let finished = false;

        const finish = (error, result) => {

            if (finished) return;

            finished = true;

            if (oauthServer) {
                oauthServer.close();
                oauthServer = null;
            }

            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        };


        const oauthApp = express();


        oauthApp.get("/oauth2callback", async (req, res) => {

            try {

                const receivedState = req.query.state;
                const code = req.query.code;
                const error = req.query.error;


                // User cancelled Google login
                if (error) {

                    res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>CinouAI</title>
                        </head>
                        <body style="
                            margin:0;
                            font-family:Arial,sans-serif;
                            text-align:center;
                            padding:60px;
                        ">
                            <h2>Google sign-in was cancelled.</h2>
                            <p>You can close this window and return to CinouAI.</p>
                        </body>
                        </html>
                    `);

                    finish(
                        new Error("Google sign-in cancelled.")
                    );

                    return;
                }


                // Validate OAuth state
                if (!receivedState || receivedState !== state) {

                    res.status(400).send("Invalid OAuth state.");

                    finish(
                        new Error("Invalid OAuth state.")
                    );

                    return;
                }


                // Make sure Google returned a code
                if (!code) {

                    res.status(400).send(
                        "No authorization code received."
                    );

                    finish(
                        new Error("No authorization code received.")
                    );

                    return;
                }


                const port = oauthServer.address().port;

                const redirectUri =
                    `http://127.0.0.1:${port}/oauth2callback`;


                // ====================================================
                // Exchange authorization code for Google tokens
                // ====================================================
                const tokenResponse = await fetch(
                    "https://oauth2.googleapis.com/token",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body: new URLSearchParams({
                            client_id: GOOGLE_CLIENT_ID,
                            client_secret: GOOGLE_CLIENT_SECRET,
                            code,
                            code_verifier: verifier,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri
                        })
                    }
                );


                const tokens = await tokenResponse.json();


                if (
                    !tokenResponse.ok ||
                    !tokens.access_token
                ) {

                    console.error("GOOGLE TOKEN ERROR:", JSON.stringify(tokens, null, 2));

                    res.status(500).send(`
                        <!DOCTYPE html>
                        <html>
                        <body style="
                            margin:0;
                            font-family:Arial,sans-serif;
                            text-align:center;
                            padding:60px;
                        ">
                            <h2>Google sign-in failed.</h2>
                            <p>You can close this window and return to CinouAI.</p>
                        </body>
                        </html>
                    `);

                    finish(
                        new Error(
                            tokens.error_description ||
                            tokens.error ||
                            "Google token exchange failed."
                        )
                    );

                    return;
                }


                // ====================================================
                // Get Google account information
                // ====================================================
                const userResponse = await fetch(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${tokens.access_token}`
                        }
                    }
                );


                const user = await userResponse.json();


                if (
                    !userResponse.ok ||
                    !user.sub
                ) {

                    console.error(
                        "Google userinfo error:",
                        user
                    );

                    res.status(500).send(`
                        <!DOCTYPE html>
                        <html>
                        <body style="
                            margin:0;
                            font-family:Arial,sans-serif;
                            text-align:center;
                            padding:60px;
                        ">
                            <h2>Could not read Google account.</h2>
                            <p>You can close this window and return to CinouAI.</p>
                        </body>
                        </html>
                    `);

                    finish(
                        new Error(
                            "Could not read Google account."
                        )
                    );

                    return;
                }


                // ====================================================
                // Tell browser that login succeeded
                // ====================================================
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>CinouAI</title>
                    </head>
                    <body style="
                        margin:0;
                        font-family:Arial,sans-serif;
                        text-align:center;
                        padding:60px;
                    ">
                        <h2>Signed in to CinouAI ✓</h2>
                        <p>You can close this window and return to the app.</p>

                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 1200);
                        </script>
                    </body>
                    </html>
                `);


                // ====================================================
                // Return only the profile information needed by
                // cinou-auth-gate.js
                // ====================================================
                finish(null, {
                    id: user.sub,

                    email:
                        (user.email || "").toLowerCase(),

                    name:
                        user.name ||
                        user.email ||
                        "User",

                    picture:
                        user.picture ||
                        "",

                    emailVerified:
                        user.email_verified === true
                });

            } catch (error) {

                console.error(
                    "Google OAuth error:",
                    error
                );

                res.status(500).send(`
                    <!DOCTYPE html>
                    <html>
                    <body style="
                        margin:0;
                        font-family:Arial,sans-serif;
                        text-align:center;
                        padding:60px;
                    ">
                        <h2>Google sign-in failed.</h2>
                        <p>You can close this window and return to CinouAI.</p>
                    </body>
                    </html>
                `);

                finish(error);
            }
        });


        // ============================================================
        // Start temporary OAuth callback server
        // ============================================================
        oauthServer = oauthApp.listen(
            0,
            "127.0.0.1",
            async () => {

                try {

                    const port =
                        oauthServer.address().port;


                    const redirectUri =
                        `http://127.0.0.1:${port}/oauth2callback`;


                    // ====================================================
                    // Google OAuth authorization request
                    // ====================================================
                    const params = new URLSearchParams({

                        client_id:
                            GOOGLE_CLIENT_ID,

                        redirect_uri:
                            redirectUri,

                        response_type:
                            "code",

                        scope:
                            "openid email profile",

                        state:
                            state,

                        code_challenge:
                            challenge,

                        code_challenge_method:
                            "S256"
                    });


                    const authUrl =
                        `https://accounts.google.com/o/oauth2/v2/auth?${params}`;


                    // Open user's normal browser
                    await shell.openExternal(authUrl);

                } catch (error) {

                    finish(error);
                }
            }
        );
    });
}


// ============================================================
// CREATE CINOUAI WINDOW
// ============================================================
async function createWindow() {

    const webApp = express();


    // Keep the existing local web application
    webApp.use(
        express.static(
            path.join(__dirname, "www")
        )
    );


    // Use a random local port
    server = webApp.listen(
        0,
        "127.0.0.1",
        () => {

            const port =
                server.address().port;


            win = new BrowserWindow({

                width: 1400,
                height: 900,

                minWidth: 900,
                minHeight: 600,

                autoHideMenuBar: true,


                // CinouAI icon
                icon: path.join(
                    __dirname,
                    "build",
                    "icon.ico"
                ),


                webPreferences: {

                    contextIsolation: true,

                    nodeIntegration: false,

                    // IMPORTANT:
                    // This loads preload.js so
                    // window.cinouAuth exists.
                    preload: path.join(
                        __dirname,
                        "preload.js"
                    )
                }
            });


            // Load the local CinouAI application
            win.loadURL(
                `http://127.0.0.1:${port}/`
            );
        }
    );
}


// ============================================================
// ELECTRON <-> PRELOAD GOOGLE AUTH BRIDGE
// ============================================================
ipcMain.handle(
    "google-sign-in",
    async () => {

        try {

            const user =
                await googleSignIn();


            return {
                success: true,
                user
            };

        } catch (error) {

            console.error(
                "CinouAI Google Sign-In:",
                error
            );


            return {

                success: false,

                error:
                    error.message ||
                    "Google sign-in failed."
            };
        }
    }
);


// ============================================================
// ELECTRON START
// ============================================================
app.whenReady().then(
    createWindow
);


// ============================================================
// CLOSE
// ============================================================
app.on(
    "window-all-closed",
    () => {

        if (server) {
            server.close();
        }

        if (oauthServer) {
            oauthServer.close();
        }

        app.quit();
    }
);

