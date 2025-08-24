const fs = require('fs');
const path = require('path');

/**
 * Script para actualizar automáticamente las direcciones de contratos
 * en el archivo de configuración del frontend
 */

function updateFrontendConfig(contracts, network = 'LOCALHOST') {
    try {
        const configPath = path.join(__dirname, '../../react-app/src/config/arandu-config.js');
        
        if (!fs.existsSync(configPath)) {
            console.log('❌ Archivo de configuración no encontrado:', configPath);
            return false;
        }

        // Leer el archivo actual
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Preparar las nuevas direcciones
        const newContractsConfig = {
            CERTIFICATES: contracts.certificates,
            ANDU_TOKEN: contracts.anduToken,
            REGISTRAR: contracts.registrar,
            VERIFIERS: {
                REGISTRATION: contracts.verifiers.registration,
                MINT: contracts.verifiers.mint,
                TRANSFER: contracts.verifiers.transfer,
                BURN: contracts.verifiers.burn,
                WITHDRAW: contracts.verifiers.withdraw
            }
        };

        // Buscar y reemplazar la configuración de la red específica
        const networkRegex = new RegExp(
            `(${network}:\\s*{[^}]*)(CERTIFICATES:\\s*"[^"]*"[^}]*)(}(?:,|\\s*}))`,
            'gs'
        );

        const newNetworkConfig = `CERTIFICATES: "${newContractsConfig.CERTIFICATES}",
        ANDU_TOKEN: "${newContractsConfig.ANDU_TOKEN}",
        REGISTRAR: "${newContractsConfig.REGISTRAR}",
        VERIFIERS: {
            REGISTRATION: "${newContractsConfig.VERIFIERS.REGISTRATION}",
            MINT: "${newContractsConfig.VERIFIERS.MINT}",
            TRANSFER: "${newContractsConfig.VERIFIERS.TRANSFER}",
            BURN: "${newContractsConfig.VERIFIERS.BURN}",
            WITHDRAW: "${newContractsConfig.VERIFIERS.WITHDRAW}"
        }`;

        // Si la red existe, actualizar; si no, mantener el contenido original
        if (configContent.includes(`${network}: {`)) {
            const startPattern = `${network}: {`;
            const startIndex = configContent.indexOf(startPattern);
            
            if (startIndex !== -1) {
                // Encontrar el final del bloque de la red
                let braceCount = 0;
                let endIndex = startIndex + startPattern.length;
                
                for (let i = startIndex + startPattern.length; i < configContent.length; i++) {
                    if (configContent[i] === '{') braceCount++;
                    if (configContent[i] === '}') {
                        if (braceCount === 0) {
                            endIndex = i;
                            break;
                        }
                        braceCount--;
                    }
                }

                // Reemplazar el contenido del bloque
                const before = configContent.substring(0, startIndex + startPattern.length);
                const after = configContent.substring(endIndex);
                
                configContent = before + '\n        ' + newNetworkConfig + '\n    ' + after;
            }
        }

        // Escribir el archivo actualizado
        fs.writeFileSync(configPath, configContent, 'utf8');
        
        console.log('✅ Configuración del frontend actualizada');
        console.log(`📱 Red: ${network}`);
        console.log('   Archivo:', configPath);
        
        return true;
        
    } catch (error) {
        console.log('❌ Error actualizando configuración del frontend:', error.message);
        return false;
    }
}

// Función para detectar automáticamente la red
function detectNetwork(chainId) {
    switch (chainId) {
        case 31337:
            return 'LOCALHOST';
        case 43113:
            return 'FUJI';
        default:
            return 'LOCALHOST';
    }
}

module.exports = {
    updateFrontendConfig,
    detectNetwork
};

// Si se ejecuta directamente
if (require.main === module) {
    console.log('🔧 Script de actualización de configuración del frontend');
    console.log('Este script se ejecuta automáticamente durante el despliegue.');
}

// Nueva función: actualiza el archivo .env del frontend con variables REACT_APP_*
function updateFrontendEnv(contracts, network = 'LOCALHOST', chainId = null) {
    try {
        const envPath = path.join(__dirname, '../../react-app/.env');

        // Leer existente o crear vacío
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

    const vars = {
            [`REACT_APP_${network}_CERTIFICATES`]: contracts.certificates,
            [`REACT_APP_${network}_ANDU_TOKEN`]: contracts.anduToken,
            [`REACT_APP_${network}_REGISTRAR`]: contracts.registrar,
            [`REACT_APP_${network}_VERIFIER_REGISTRATION`]: contracts.verifiers.registration,
            [`REACT_APP_${network}_VERIFIER_MINT`]: contracts.verifiers.mint,
            [`REACT_APP_${network}_VERIFIER_TRANSFER`]: contracts.verifiers.transfer,
            [`REACT_APP_${network}_VERIFIER_BURN`]: contracts.verifiers.burn,
            [`REACT_APP_${network}_VERIFIER_WITHDRAW`]: contracts.verifiers.withdraw
        };

    // Añadir variables de red para que el frontend conozca la red actual
    vars[`REACT_APP_NETWORK`] = (network || 'LOCALHOST').toUpperCase();
    if (chainId) vars[`REACT_APP_CHAIN_ID`] = String(chainId);

        // Reemplazar o añadir
        for (const [k, v] of Object.entries(vars)) {
            const regex = new RegExp(`^${k}=.*$`, 'm');
            const line = `${k}=${v}`;
            if (envContent.match(regex)) {
                envContent = envContent.replace(regex, line);
            } else {
                if (envContent.length > 0 && !envContent.endsWith('\n')) envContent += '\n';
                envContent += line + '\n';
            }
        }

        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('✅ Archivo .env del frontend actualizado:', envPath);
        return true;
    } catch (error) {
        console.log('❌ Error actualizando .env del frontend:', error.message);
        return false;
    }
}

// Exportar también
module.exports.updateFrontendEnv = updateFrontendEnv;

// Sincronizar ABIs y direcciones desde hardhat/deployments/<network> hacia frontend/src/abis
function syncDeploymentsToFrontend(networkNameOrChainId) {
    try {
        const frontendAbisDir = path.join(__dirname, '../../react-app/src/abis');

        // posibles rutas: <networkName>, 'unknown', <chainId>
        const candidates = [];
        if (networkNameOrChainId) candidates.push(String(networkNameOrChainId).toLowerCase());
        candidates.push('unknown');

        // intentar agregar también el chainId si el input es LOCALHOST/FUJI mapearlo
        const chainMap = { 'localhost': '31337', 'fuji': '43113', 'local': '31337' };
        if (chainMap[networkNameOrChainId?.toLowerCase()]) candidates.push(chainMap[networkNameOrChainId.toLowerCase()]);

        let deploymentsDir = null;
        for (const c of candidates) {
            const p = path.join(__dirname, '../deployments', c);
            if (fs.existsSync(p)) {
                deploymentsDir = p;
                break;
            }
        }

        if (!deploymentsDir) {
            console.log('⚠️  No se encontró carpeta de deployments para la red (candidatos):', candidates);
            return false;
        }

        if (!fs.existsSync(frontendAbisDir)) {
            fs.mkdirSync(frontendAbisDir, { recursive: true });
        }

        const files = fs.readdirSync(deploymentsDir);
        let copied = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const filePath = path.join(deploymentsDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const json = JSON.parse(content);

                // Expecting typical hardhat-deploy artifact with 'abi' and 'address' or network-specific mapping
                let abi = json.abi || json.contract?.abi || null;
                let address = json.address || json.contract?.address || null;

                // Some deployments include an object keyed by network id
                if (!address && json.addresses) {
                    // pick first address
                    const keys = Object.keys(json.addresses);
                    if (keys.length) address = json.addresses[keys[0]];
                }

                if (!abi) {
                    // try to read artifact from artifacts folder fallback
                    const artifactPath = path.join(__dirname, '../artifacts', file.replace('.json','') + '.json');
                    if (fs.existsSync(artifactPath)) {
                        const art = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                        abi = art.abi || null;
                    }
                }

                if (!abi) {
                    console.log(`⚠️  No ABI encontrada en ${file}, se omite`);
                    continue;
                }

                const contractName = path.basename(file, '.json');
                const out = {
                    contractName,
                    address,
                    abi
                };

                const outPath = path.join(frontendAbisDir, `${contractName}.json`);
                fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
                copied++;

            } catch (err) {
                console.log('⚠️  Error procesando deployment file', file, err.message);
            }
        }

        console.log(`✅ Copiadas ${copied} ABIs al frontend:`, frontendAbisDir);

        // Además, intentar copiar decryption_keys.json (si existe) al frontend/src/contracts
        try {
            const frontendContractsDir = path.join(__dirname, '../../react-app/src/contracts');
            if (!fs.existsSync(frontendContractsDir)) fs.mkdirSync(frontendContractsDir, { recursive: true });

            // posibles ubicaciones del archivo de claves de descifrado
            const candidateKeys = [
                path.join(deploymentsDir, 'decryption_keys.json'),
                path.join(__dirname, '../decryption_keys.json'),
                path.join(__dirname, '../../decryption_keys.json')
            ];

            let foundKey = null;
            for (const c of candidateKeys) {
                if (fs.existsSync(c)) {
                    foundKey = c;
                    break;
                }
            }

            if (foundKey) {
                const dest = path.join(frontendContractsDir, 'decryption_keys.json');
                fs.copyFileSync(foundKey, dest);
                console.log('🔐 Copiado decryption_keys.json al frontend:', dest);
            } else {
                console.log('ℹ️  No se encontró decryption_keys.json en las rutas candidatas.');
            }
        } catch (e) {
            console.log('⚠️  Error copiando decryption_keys.json al frontend:', e.message);
        }

        return true;
    } catch (error) {
        console.log('❌ Error sincronizando deployments al frontend:', error.message);
        return false;
    }
}

module.exports.syncDeploymentsToFrontend = syncDeploymentsToFrontend;

// Mover archivos desde deployments/unknown (u otras) hacia deployments/<network>
function migrateDeploymentsToNetwork(networkName) {
    try {
        const deploymentsRoot = path.join(__dirname, '../deployments');
        const targetDir = path.join(deploymentsRoot, String(networkName).toLowerCase());
        const unknownDir = path.join(deploymentsRoot, 'unknown');

        if (!fs.existsSync(unknownDir)) {
            console.log('ℹ️  No existe carpeta "unknown". No hay archivos para migrar.');
            return false;
        }

        fs.mkdirSync(targetDir, { recursive: true });

        const files = fs.readdirSync(unknownDir);
        let moved = 0;
        for (const f of files) {
            const src = path.join(unknownDir, f);
            const dest = path.join(targetDir, f);
            try {
                // si ya existe en destino, lo sobreescribimos
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                fs.renameSync(src, dest);
                moved++;
            } catch (e) {
                console.log('⚠️  Error moviendo', src, '->', dest, e.message);
            }
        }

        // intentar eliminar carpeta unknown si quedó vacía
        try {
            const remaining = fs.readdirSync(unknownDir);
            if (remaining.length === 0) fs.rmdirSync(unknownDir);
        } catch (e) {
            // ignore
        }

        console.log(`✅ Migrados ${moved} archivos desde deployments/unknown a ${targetDir}`);
        return true;
    } catch (error) {
        console.log('❌ Error migrando deployments:', error.message);
        return false;
    }
}

module.exports.migrateDeploymentsToNetwork = migrateDeploymentsToNetwork;
