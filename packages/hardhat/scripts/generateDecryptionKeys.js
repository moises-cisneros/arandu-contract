const fs = require('fs');
const path = require('path');

/**
 * Script ligero para generar un archivo decryption_keys.json localmente
 * a partir de packages/hardhat/wallets/test-wallets.json sin interactuar
 * con la red. Útil para pruebas en frontend cuando no se desea registrar
 * en la blockchain.
 */
async function main() {
    try {
        const walletsPath = path.join(__dirname, '../wallets/test-wallets.json');
        if (!fs.existsSync(walletsPath)) {
            console.error('No se encontró', walletsPath);
            process.exit(1);
        }

        const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
        const decryptionKeys = {};

        for (const w of walletsData.wallets || []) {
            const addr = w.address;
            try {
                // Intentar usar SDK si está disponible (opcional)
                const sdk = require('@avalabs/eerc-sdk');
                if (sdk && typeof sdk.generateDecryptionKeyFromPrivateKey === 'function') {
                    const dek = sdk.generateDecryptionKeyFromPrivateKey(w.privateKey);
                    decryptionKeys[addr] = dek;
                    console.log('Key generada via SDK para', addr);
                    continue;
                }
            } catch (e) {
                // SDK no disponible -> fallback
            }

            // Fallback demo key (para pruebas en frontend)
            decryptionKeys[addr] = `demo-dek-${addr}`;
            console.log('Demo key creada para', addr);
        }

        const outPath = path.join(__dirname, '..', 'decryption_keys.json');
        fs.writeFileSync(outPath, JSON.stringify(decryptionKeys, null, 2), 'utf8');
        console.log('Archivo escrito en', outPath);

        // Copiar al frontend
        const frontendDir = path.join(__dirname, '../../react-app/src/contracts');
        if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
        const dest = path.join(frontendDir, 'decryption_keys.json');
        fs.copyFileSync(outPath, dest);
        console.log('Copiado a frontend:', dest);

        process.exit(0);
    } catch (err) {
        console.error('Error generando decryption keys:', err.message);
        process.exit(1);
    }
}

main();
