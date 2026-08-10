import { storage, exchangeCode} from '@/modules/oidc'


async function main() {
    const params = new URLSearchParams(window.location.search)

    const code = params.get('code')

    if (!code) {
        document.body.textContent = "Invalid authentication callback.";
        return;
    }

    const state = params.get('state')

    if (state !== storage.getState()) {
        throw new Error('Invalid OAuth state')
    }

    const config = storage.getConfig()
    const tokens = await exchangeCode(code, config)

    window.opener?.postMessage(
        {
            type: "oidc-login-success",
            provider: config.name,
            payload: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresIn: tokens.expires_in,
                tokenType: tokens.token_type
            }
        },
        window.location.origin
    );
    storage.clearOidc();
    window.close();

}

main().catch(err => {
    console.error(err)
    document.body.textContent = 'Authentication failed.'
})