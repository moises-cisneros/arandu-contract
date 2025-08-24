/**
 * CONFIGURACIÓN DEL ECOSISTEMA ARANDU
 * Configuración owner-only sin conexión de wallet del usuario
 */

// ===============================================
// CONFIGURACIÓN DE REDES  
// ===============================================

export const NETWORKS = {
    // Localhost Hardhat (Para desarrollo y testing)
    LOCALHOST: {
        name: 'Localhost',
        rpcUrl: 'http://localhost:8545',
        CERTIFICATES: "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8",
        ANDU_TOKEN: "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9",
        REGISTRAR: "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB",
        VERIFIERS: {
            REGISTRATION: "0x09635F643e140090A9A8Dcd712eD6285858ceBef",
            MINT: "0xc5a5C42992dECbae36851359345FE25997F5C42d",
            TRANSFER: "0x67d269191c92Caf3cD7723F116c85e6E9bf55933",
            BURN: "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E",
            WITHDRAW: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690"
        }
    },

    // Avalanche Fuji Testnet 
    FUJI: {
        CERTIFICATES: "0xfEaD59A75657C23f5e688039a577439635695159",
        ANDU_TOKEN: "0x71a4285b7314C38856928e05AC0A5653C97f3A03",
        REGISTRAR: "0x4369e648dDec73f0a2194a85C6A09913d7C62D6e",
        VERIFIERS: {
            REGISTRATION: "0x95C35DfD8bAFf7D64eB24782a31Bd15920f757A7",
            MINT: "0x44e1b530a8F1288938927a41c085cd1c401462e7",
            TRANSFER: "0x395577ebf34f083b8D5694799d90FBE3fF751Bac",
            BURN: "0xD91A4017A5884d35cbC6A8c33C64726bCD3f652C",
            WITHDRAW: "0x1d8DA9bCE1cC08eB23973A6Faa170b8C52a15593"
        }
    }
};

// ===============================================
// CONFIGURACIÓN DE CONTRATOS
// ===============================================

export const ARANDU_CONTRACTS = {
    LOCALHOST: {
        CERTIFICATES: "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F",
        ANDU_TOKEN: "0x4A679253410272dd5232B3Ff7cF5dbB88f295319",
        REGISTRAR: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
        VERIFIERS: {
            REGISTRATION: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
            MINT: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
            TRANSFER: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
            BURN: "0x59b670e9fA9D0A427751Af201D676719a970857b",
            WITHDRAW: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"
        }
    },
    FUJI: {
        name: 'Fuji',
        rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
        CERTIFICATES: "0x6d61B3E4D0609f6D39590170e86ce2F8F0A41ddE",
        ANDU_TOKEN: "0x7431acD1Db99b6BB8c61a926d3a9CA552a54f38e",
        REGISTRAR: "0xbCE91B8Ad34746855B6680Da80fc0991DC8F04Eb",
        VERIFIERS: {
            REGISTRATION: "0x14e59806054773fc341377aEC472C07e500BCc86",
            MINT: "0xf4A6230C5388e2fF4036a26C09A36E0937a972D7",
            TRANSFER: "0x1f65E72EE31F709969Dfc75f98f5867EaE332CD9",
            BURN: "0x3028a9AfCD5E2c3C2E1fD35d984Be65640ca4e07",
            WITHDRAW: "0xBB01f5338bF77E1b897c226A88fc13bd61Cd55FB"
        }
    }
};

// ===============================================
// WALLETS DE PRUEBA (Solo para consulta)
// ===============================================

export const TEST_WALLETS = {
    director: {
        address: "0x532b096620C0cf49373ce0309396239621Ea02e4",
        name: "Director"
    },
    docente: {
        address: "0xDdbf3aeBcCa5B30e4F93E0b8b5d3d7dc2d3e8C38",
        name: "Docente"
    }
};

// ===============================================
// CONFIGURACIÓN OWNER (Solo backend)
// ===============================================

export const OWNER_CONFIG = {
    LOCALHOST: {
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    FUJI: {
        address: "0xAB659E7197bB3c399E9a295261F1D4557D4A714B" // Dirección del deployer en Fuji
    }
};

// ===============================================
// ABIS DE CONTRATOS (Para frontend)
// ===============================================

export const CONTRACT_ABIS = {
    CERTIFICATES: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function totalSupply() view returns (uint256)"
    ],
    ANDU_TOKEN: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
    ]
};
