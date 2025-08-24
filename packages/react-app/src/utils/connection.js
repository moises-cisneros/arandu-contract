// Utils para conexión RPC y signer
export function resolveRpcUrl(selectedNetwork, networksConfig = {}) {
    if (!selectedNetwork) return null;
    // Normalizar nombre de red para evitar problemas con mayúsculas/minúsculas
    const key = Object.keys(networksConfig).find(k => k.toLowerCase() === String(selectedNetwork).toLowerCase());
    const rpcUrl = key ? networksConfig[key]?.rpcUrl : null;
    if (rpcUrl) return rpcUrl;

    // Fallback to env (import.meta.env) in browser or process.env in node
    const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
        const name = String(selectedNetwork).toUpperCase();
        // check specific REACT_APP_<NETWORK>_RPC_URL
        const specific = env[`REACT_APP_${name}_RPC_URL`] || env[`VITE_${name}_RPC_URL`];
        if (specific) return specific;

        // generic fallbacks
        return env.REACT_APP_RPC_URL || env.VITE_RPC_URL || null;
}

    export function getFrontendNetwork() {
        try {
            if (typeof window !== 'undefined' && window.__env && window.__env.REACT_APP_NETWORK) return window.__env.REACT_APP_NETWORK;
            const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
            return env.REACT_APP_NETWORK || env.VITE_NETWORK || null;
        } catch {
            return null;
        }
    }

export function getFrontendPrivateKey() {
    // Prefer window.__env injected value (runtime), then build-time import.meta.env
    if (typeof window !== 'undefined' && window.__env && window.__env.REACT_APP_FRONTEND_PRIVATE_KEY) return window.__env.REACT_APP_FRONTEND_PRIVATE_KEY;
    const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
    return env.REACT_APP_FRONTEND_PRIVATE_KEY || env.VITE_FRONTEND_PRIVATE_KEY || null;
}

export async function createProvider(rpcUrl) {
    if (!rpcUrl) throw new Error('RPC URL required');
    // Dynamic import of ethers (preferred) to avoid relying on globals
    const mod = await import('ethers');
        // Support multiple shapes: import('ethers') can return { ethers }, or default, or direct exports
        const EthersLib = mod?.ethers || mod?.default || mod;
        // v6: providers.JsonRpcProvider, v5: providers.JsonRpcProvider
        const Providers = EthersLib?.providers || (EthersLib && EthersLib?.JsonRpcProvider ? { JsonRpcProvider: EthersLib.JsonRpcProvider } : null);
        if (!Providers || !Providers.JsonRpcProvider) {
            throw new Error('Ethers provider not available');
        }
        return new Providers.JsonRpcProvider(rpcUrl);
}

export async function createSigner(privateKey, provider) {
    if (!privateKey) return null;
    const mod = await import('ethers');
    const EthersLib = mod?.ethers || mod;
    return new EthersLib.Wallet(privateKey, provider);
}

export async function loadAbi(contractName) {
    try {
        const mod = await import(`../abis/${contractName}.json`);
        return mod?.default?.abi || mod?.default || mod?.abi || mod;
    } catch {
        return null;
    }
}
