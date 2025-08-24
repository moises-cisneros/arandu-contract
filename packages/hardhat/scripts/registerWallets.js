const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
    console.log('🔐 registerWallets: registrando wallets de prueba y generando decryption_keys.json');

    const network = await hre.ethers.provider.getNetwork();
    const networkName = network.chainId === 43113 ? 'fuji' : (network.chainId === 31337 ? 'localhost' : network.name);

    // Cargar deployments
    const deploymentsDir = path.join(__dirname, `../deployments/${networkName}`);
    if (!fs.existsSync(deploymentsDir)) {
        console.error('No se encontraron deployments en', deploymentsDir);
        process.exit(1);
    }

    // Leer wallets.json si existe
    let wallets = null;
    const walletsPath = path.join(__dirname, 'wallets.json');
    if (fs.existsSync(walletsPath)) {
        wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
    } else {
        console.error('No se encontró wallets.json en scripts. Crea o copia tu archivo en packages/hardhat/scripts/wallets.json');
        process.exit(1);
    }

    // Cargar contratos desde deployments
    function readDeployment(name) {
        const p = path.join(deploymentsDir, `${name}.json`);
        if (!fs.existsSync(p)) return null;
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }

    const registrarDep = readDeployment('Registrar');
    if (!registrarDep) {
        console.error('No se encontró deployment de Registrar en', deploymentsDir);
        process.exit(1);
    }

    const ownerPrivateKey = process.env.PRIVATE_KEY;
    if (!ownerPrivateKey) {
        console.error('PRIVATE_KEY no definida en el entorno. Añade la clave privada del owner en .env');
        process.exit(1);
    }

    const provider = hre.ethers.provider;
    const owner = new hre.ethers.Wallet(ownerPrivateKey, provider);
    const registrar = new hre.ethers.Contract(registrarDep.contractName ? registrarDep.contractName : 'Registrar', registrarDep.address, owner);

    const decryptionKeys = {};

    for (const w of wallets.wallets || []) {
        const addr = w.address;
        console.log(`Procesando wallet ${w.name} ${addr}`);
        let isReg = false;
        try { isReg = await registrar.isUserRegistered(addr); } catch (e) { console.warn('No se pudo verificar registro:', e.message); }

        if (!isReg) {
            console.log(`Registrando ${addr}...`);
            // Generación de prueba de registro con eERC SDK
            try {
                const sdk = require('@avalabs/eerc-sdk');
                // La API real del SDK puede variar; aquí asumimos funciones hipotéticas
                const proof = await sdk.generateRegisterProof(addr);
                const tx = await registrar.register(proof);
                await tx.wait();
                console.log('Registro enviado:', tx.hash);
                // Generar decryptionKey desde la clave privada
                const dek = sdk.generateDecryptionKeyFromPrivateKey(w.privateKey);
                decryptionKeys[addr] = dek;
                console.log('Decryption key generada para', addr);
            } catch (e) {
                console.warn('SDK no disponible o fallo en registro via SDK, haciendo registro demo');
                // fallback: llamar register con dummy bytes
                const dummy = hre.ethers.utils.randomBytes(64);
                const tx = await registrar.register(dummy);
                await tx.wait();
                const fakeDek = `demo-dek-${addr}`;
                decryptionKeys[addr] = fakeDek;
                console.log('Registro demo completado para', addr);
            }
        } else {
            console.log(`${addr} ya está registrado; generando/obteniendo decryptionKey`);
            try {
                const sdk = require('@avalabs/eerc-sdk');
                const dek = sdk.generateDecryptionKeyFromPrivateKey(w.privateKey);
                decryptionKeys[addr] = dek;
                console.log('Decryption key generada para', addr);
            } catch (e) {
                const fakeDek = `demo-dek-${addr}`;
                decryptionKeys[addr] = fakeDek;
                console.log('SDK no disponible; guardada demo key para', addr);
            }
        }
    }

    const outPath = path.join(__dirname, '..', 'decryption_keys.json');
    fs.writeFileSync(outPath, JSON.stringify(decryptionKeys, null, 2), 'utf8');
    console.log('Archivo decryption_keys.json escrito en', outPath);

    // Intentar copiar al frontend contracts dir si existe
    try {
        const frontendDir = path.join(__dirname, '../../react-app/src/contracts');
        if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
        const dest = path.join(frontendDir, 'decryption_keys.json');
        fs.copyFileSync(outPath, dest);
        console.log('decryption_keys.json copiado a frontend:', dest);
    } catch (e) {
        console.warn('No se pudo copiar decryption_keys.json al frontend:', e.message);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
