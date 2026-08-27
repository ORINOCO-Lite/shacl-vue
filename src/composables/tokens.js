// src/composables/tokens.js
import { ref } from 'vue';

const tokenName = 'serviceToken';
const token = ref(sessionStorage.getItem(tokenName) || null);

export function useToken() {
    
    const setToken = (newToken, tokenType = 'unknown', tokenTimeout = 0, refreshToken = null) => {
        // tokenType = 'unknown' | 'manual' | 'url' | 'oidc'
        token.value = newToken;
        sessionStorage.setItem(tokenName, newToken);
        sessionStorage.setItem('tokenType', tokenType);
        const tokenTime = new Date();
        sessionStorage.setItem('tokenTime', tokenTime);
        if (tokenTimeout) sessionStorage.setItem('tokenTimeout', tokenTimeout);
        if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
        console.log("Setting token details from composable:")
        console.log({
            newToken: newToken,
            tokenType: tokenType,
            tokenTime: tokenTime,
            tokenTimeout: tokenTimeout,
            refreshToken: refreshToken,
        })

    };

    const clearToken = () => {
        token.value = null;
        sessionStorage.removeItem(tokenName);
        sessionStorage.removeItem('tokenType');
        sessionStorage.removeItem('tokenTime');
        sessionStorage.removeItem('tokenTimeout');
        sessionStorage.removeItem('refreshToken');
    };

    const getTokenDetails = () => {
        return {
            tokenName: tokenName,
            tokenVal: sessionStorage.getItem(tokenName),
            tokenType: sessionStorage.getItem('tokenType'),
            tokenTime: sessionStorage.getItem('tokenTime'),
            tokenTimeout: sessionStorage.getItem('tokenTimeout'),
            refreshToken: sessionStorage.getItem('refreshToken'),
        }
    };

    const getTokenValidity = () => {
        const tokenDeets = getTokenDetails();
        if (!tokenDeets.tokenTimeout || !tokenDeets.tokenTime) return undefined;
        const timeNow = new Date();
        const timeToken = new Date(tokenDeets.tokenTime);
        const timePassed = (timeNow - timeToken)/1000;
        if (timePassed < tokenDeets.tokenTimeout ) return true;
        return false;
    };

    return { token, setToken, clearToken, getTokenDetails, getTokenValidity};
}
