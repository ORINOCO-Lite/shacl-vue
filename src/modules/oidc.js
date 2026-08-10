export async function openOidcAuthUrl(config) {
    // Generate code verifier
    const codeVerifier = getRandomString(64);
    // Generate state
    const state = getRandomString(32);
    // Store in localStorage
    storage.saveVerifier(codeVerifier);
    storage.saveState(state);
    storage.saveConfig(config);
    // Calculate code challenge
    const codeChallenge = await getCodeChallenge(codeVerifier);
    // Construct URL
    const authUrl = getOidcAuthUrl(config, codeChallenge, state)
    // Open URL
    const loginWindow = window.open(authUrl, "_blank");
    // What then?
}


function getRandomString(length = 66) {
    // Return a random string with a minimum length of 43 characters and a maximum
    // length of 128 characters. It can contain alphanumeric characters as well as
    // the characters -, ., _, and ~.
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return [...bytes].map(b => chars[b % chars.length]).join("");
}


async function getCodeChallenge(verifier) {
    // See: https://forgejo.org/docs/latest/user/authentication/oauth2-provider/#public-client-pkce
    // Return a URL-safe base64-encoded string of the SHA256 hash of code_verifier
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier)
    );
    return base64url(digest);
}


function base64url(digest) {
    // Incoming digest is an array buffer.
    // We first turn it into a Uint Array,
    // and then into a binary string for btoa.
    // Finally, for base64 URL-safe encoding we need to remove/change
    // specific characters: +/=
    // See: https://developer.mozilla.org/en-US/docs/Glossary/Base64
    // "This version, defined in RFC 4648, section 5, omits the padding and replaces + and / with - and _"
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}


function getOidcAuthUrl(config, challenge, state) {

    // https://[YOUR-FORGEJO-URL]/login/oauth/authorize? \
    // client_id=CLIENT_ID& \
    // redirect_uri=REDIRECT_URI& \
    // response_type=code& \
    // code_challenge_method=CODE_CHALLENGE_METHOD& \
    // code_challenge=CODE_CHALLENGE& \
    // state=STATE

    const params = new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: config.response_type,
        code_challenge_method: config.code_challenge_method,
        code_challenge: challenge,
        state: state,
    });

    return `${config.base_url}/${config.auth_endpoint}?${params}`

}


export async function exchangeCode(code, config) {
    // Exchange code for token by POST request

    const body = new URLSearchParams({
        client_id: config.client_id,
        code: code,
        grant_type: config.grant_type,
        redirect_uri: config.redirect_uri,
        code_verifier: storage.getVerifier()
    });

    console.log(body)

    const res = await fetch(`${config.base_url}/${config.token_endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body
    });

    const tokens = await res.json();

    return tokens;
}


export const storage = {
    saveVerifier(v) {
        localStorage.setItem("pkce_verifier", v);
    },

    getVerifier() {
        return localStorage.getItem("pkce_verifier");
    },

    saveState(s) {
        localStorage.setItem("oauth_state", s);
    },

    getState() {
        return localStorage.getItem("oauth_state");
    },

    saveConfig(c) {
        localStorage.setItem("oauth_config", JSON.stringify(c));
    },

    getConfig() {
        return JSON.parse(localStorage.getItem("oauth_config"));
    },

    clearOidc() {
        localStorage.removeItem("pkce_verifier");
        localStorage.removeItem("oauth_state");
        localStorage.removeItem("oauth_config");
    }
};



