const pkg = require("hardhat");
const { ethers } = pkg;
const fs = require('fs');
const path = require('path');
const { updateFrontendConfig, detectNetwork } = require('./update-frontend-config');

/**
 * Script directo de despliegue para el ecosistema ARANDU
 * 
 * Uso:
 * npx hardhat run scripts/deploy-arandu.js --network fuji
 * npx hardhat run scripts/deploy-arandu.js --network localhost
 */

async function main() {
    console.log("🌟 ======== SCRIPT DE DESPLIEGUE DIRECTO ARANDU ========");
    
    // Obtener signers
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("📋 Red:", network.name);
    console.log("📋 Chain ID:", network.chainId.toString());
    console.log("📋 Deployer:", deployer.address);
    console.log("📋 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    if (network.chainId !== 43113 && network.chainId !== 31337) {
        console.log("⚠️  ADVERTENCIA: Este script está configurado para Fuji Testnet (43113) o localhost (31337)");
        console.log("⚠️  Red actual:", network.chainId.toString());
        console.log("⚠️  Continuando en 5 segundos...");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // ===============================================
    // PASO 1: VERIFICADORES ZK
    // ===============================================
    console.log("🔐 PASO 1: Desplegando Verificadores ZK...");
    
    console.log("   📝 RegistrationCircuitGroth16Verifier...");
    const RegistrationVerifier = await ethers.getContractFactory("RegistrationCircuitGroth16Verifier");
    const registrationVerifier = await RegistrationVerifier.deploy();
    await registrationVerifier.deployed();
    console.log("   ✅ Registration:", registrationVerifier.address);

    console.log("   🪙 MintCircuitGroth16Verifier...");
    const MintVerifier = await ethers.getContractFactory("MintCircuitGroth16Verifier");
    const mintVerifier = await MintVerifier.deploy();
    await mintVerifier.deployed();
    console.log("   ✅ Mint:", mintVerifier.address);

    console.log("   📮 TransferCircuitGroth16Verifier...");
    const TransferVerifier = await ethers.getContractFactory("TransferCircuitGroth16Verifier");
    const transferVerifier = await TransferVerifier.deploy();
    await transferVerifier.deployed();
    console.log("   ✅ Transfer:", transferVerifier.address);

    console.log("   🔥 BurnCircuitGroth16Verifier...");
    const BurnVerifier = await ethers.getContractFactory("BurnCircuitGroth16Verifier");
    const burnVerifier = await BurnVerifier.deploy();
    await burnVerifier.deployed();
    console.log("   ✅ Burn:", burnVerifier.address);

    console.log("   💸 WithdrawCircuitGroth16Verifier...");
    const WithdrawVerifier = await ethers.getContractFactory("WithdrawCircuitGroth16Verifier");
    const withdrawVerifier = await WithdrawVerifier.deploy();
    await withdrawVerifier.deployed();
    console.log("   ✅ Withdraw:", withdrawVerifier.address);

    console.log("");

    // ===============================================
    // PASO 2: REGISTRAR
    // ===============================================
    console.log("👤 PASO 2: Desplegando Registrar...");
    
    const Registrar = await ethers.getContractFactory("Registrar");
    const registrar = await Registrar.deploy(registrationVerifier.address);
    await registrar.deployed();
    console.log("   ✅ Registrar:", registrar.address);
    console.log("");

    // ===============================================
    // PASO 3: TOKEN ANDU (EncryptedERC)
    // ===============================================
    console.log("🪙 PASO 3: Desplegando Token ANDU...");
    
    // Primero desplegar la librería BabyJubJub
    console.log("   📚 Desplegando librería BabyJubJub...");
    const BabyJubJub = await ethers.getContractFactory("BabyJubJub");
    const babyJubJub = await BabyJubJub.deploy();
    await babyJubJub.deployed();
    const babyJubJubAddress = babyJubJub.address;
    console.log("   ✅ BabyJubJub:", babyJubJubAddress);
    
    const createEncryptedERCParams = {
        registrar: registrar.address,
        isConverter: false,
        name: "Arandu Token",
        symbol: "ANDU",
        decimals: 18,
        mintVerifier: mintVerifier.address,
        withdrawVerifier: withdrawVerifier.address,
        transferVerifier: transferVerifier.address,
        burnVerifier: burnVerifier.address
    };

    console.log("   📋 Configuración ANDU:");
    console.log("      - Nombre:", createEncryptedERCParams.name);
    console.log("      - Símbolo:", createEncryptedERCParams.symbol);
    console.log("      - Modo: Standalone");

    const EncryptedERC = await ethers.getContractFactory("EncryptedERC", {
        libraries: {
            BabyJubJub: babyJubJubAddress,
        },
    });
    const aranduToken = await EncryptedERC.deploy(createEncryptedERCParams);
    await aranduToken.deployed();
    console.log("   ✅ Token ANDU:", aranduToken.address);
    console.log("");

    // ===============================================
    // PASO 4: CERTIFICADOS NFT
    // ===============================================
    console.log("🏆 PASO 4: Desplegando Certificados...");
    
    const AranduCertificate = await ethers.getContractFactory("AranduCertificate");
    const certificates = await AranduCertificate.deploy(deployer.address);
    await certificates.deployed();
    console.log("   ✅ Certificados:", certificates.address);
    console.log("");

    // ===============================================
    // RESUMEN FINAL
    // ===============================================
    const addresses = {
        libraries: {
            babyJubJub: babyJubJubAddress
        },
        verifiers: {
            registration: registrationVerifier.address,
            mint: mintVerifier.address, 
            transfer: transferVerifier.address,
            burn: burnVerifier.address,
            withdraw: withdrawVerifier.address
        },
        registrar: registrar.address,
        aranduToken: aranduToken.address,
        certificates: certificates.address
    };

    console.log("🎉 ======== RESUMEN DEL DESPLIEGUE ========");
    console.log("");
    console.log("🔐 VERIFICADORES ZK:");
    console.log("   📝 Registration:", addresses.verifiers.registration);
    console.log("   🪙 Mint:", addresses.verifiers.mint);
    console.log("   📮 Transfer:", addresses.verifiers.transfer);
    console.log("   🔥 Burn:", addresses.verifiers.burn);
    console.log("   💸 Withdraw:", addresses.verifiers.withdraw);
    console.log("");
    console.log("� LIBRERÍAS:");
    console.log("   🔑 BabyJubJub:", addresses.libraries.babyJubJub);
    console.log("");
    console.log("�👤 SISTEMA:");
    console.log("   📋 Registrar:", addresses.registrar);
    console.log("");
    console.log("🪙 TOKEN ANDU:");
    console.log("   💰 EncryptedERC:", addresses.aranduToken);
    console.log("");
    console.log("🏆 CERTIFICADOS:");
    console.log("   🎓 AranduCertificate:", addresses.certificates);
    console.log("");

    // Guardar direcciones en archivo JSON
    const fs = require("fs");
    const deploymentData = {
        network: network.name,
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: addresses
    };

    const fileName = `deployment-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentData, null, 2));
    console.log("💾 Direcciones guardadas en:", fileName);
    console.log("");

    // Determinar nombre de red estandarizado usando detectNetwork
    const networkName = detectNetwork(network.chainId);

    // Migrar archivos existentes desde unknown -> <networkName> si aplica
    try {
        const { migrateDeploymentsToNetwork } = require('./update-frontend-config');
        migrateDeploymentsToNetwork(networkName);
    } catch (e) {
        console.log('⚠️  No se pudo ejecutar migración de deployments:', e.message);
    }

    // Escribir archivos por contrato en packages/hardhat/deployments/<networkName>
    try {
        const deploymentsDir = path.join(__dirname, '../deployments', networkName.toLowerCase());
        fs.mkdirSync(deploymentsDir, { recursive: true });

        // helper async para escribir artifact + address
        async function writeArtifactFile(contractName, addr) {
            try {
                const artifact = await pkg.artifacts.readArtifact(contractName);
                const out = { contractName, address: addr, abi: artifact.abi };
                const outPath = path.join(deploymentsDir, `${contractName}.json`);
                fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
                console.log('   💾 Archivo deployment creado:', outPath);
            } catch (e) {
                console.log('   ⚠️  No se pudo crear deployment file para', contractName, e.message);
            }
        }

        // escribir verificadores
        await writeArtifactFile('RegistrationCircuitGroth16Verifier', registrationVerifier.address);
        await writeArtifactFile('MintCircuitGroth16Verifier', mintVerifier.address);
        await writeArtifactFile('TransferCircuitGroth16Verifier', transferVerifier.address);
        await writeArtifactFile('BurnCircuitGroth16Verifier', burnVerifier.address);
        await writeArtifactFile('WithdrawCircuitGroth16Verifier', withdrawVerifier.address);

        // registrar, librería, token y certificados
        await writeArtifactFile('Registrar', registrar.address);
        await writeArtifactFile('BabyJubJub', babyJubJubAddress);
        await writeArtifactFile('EncryptedERC', aranduToken.address);
        await writeArtifactFile('AranduCertificate', certificates.address);

        console.log('✅ Archivos de deployments escritos en:', deploymentsDir);
    } catch (e) {
        console.log('⚠️  Error generando archivos de deployments por contrato:', e.message);
    }

    // ===============================================
    // ACTUALIZACIÓN AUTOMÁTICA DEL FRONTEND
    // ===============================================
    console.log("📱 ======== ACTUALIZANDO CONFIGURACIÓN FRONTEND ========");
    console.log("");
    
    // Detectar la red y actualizar automáticamente (usar la variable networkName ya definida anteriormente)
    
    // Preparar objeto de contratos para la actualización
    const contractsForUpdate = {
        registrar: addresses.registrar,
        anduToken: addresses.aranduToken,
        certificates: addresses.certificates,
        verifiers: {
            registration: addresses.verifiers.registration,
            mint: addresses.verifiers.mint,
            transfer: addresses.verifiers.transfer,
            burn: addresses.verifiers.burn,
            withdraw: addresses.verifiers.withdraw
        }
    };
    
    // Actualizar automáticamente el archivo de configuración
    const updateSuccess = updateFrontendConfig(contractsForUpdate, networkName);
    // Actualizar also el .env del frontend con variables REACT_APP_*
    try {
        const frontendEnvPath = path.join(__dirname, '../../react-app/.env');
        // Si existe un .env en el frontend, cárgalo en process.env (sin imprimir valores)
        if (fs.existsSync(frontendEnvPath)) {
            try {
                require('dotenv').config({ path: frontendEnvPath });
                console.log('🔒 .env del frontend cargado en el entorno de ejecución (no se muestran claves)');
            } catch (e) {
                console.log('⚠️  Error cargando .env del frontend:', e.message);
            }
        }

        const { updateFrontendEnv } = require('./update-frontend-config');
        const envUpdateSuccess = updateFrontendEnv(contractsForUpdate, networkName);
        if (envUpdateSuccess) console.log('✅ .env del frontend actualizado con variables REACT_APP_*');
    } catch (err) {
        console.log('⚠️  No se pudo actualizar .env del frontend:', err.message);
    }

    // Sincronizar ABIs y deployment artifacts al frontend
    try {
        const { syncDeploymentsToFrontend } = require('./update-frontend-config');
        const synced = syncDeploymentsToFrontend(networkName);
        if (synced) console.log('✅ ABIs y artifacts sincronizados al frontend');
    } catch (err) {
        console.log('⚠️  No se pudo sincronizar deployments al frontend:', err.message);
    }
    
    if (updateSuccess) {
        console.log("✅ Configuración del frontend actualizada automáticamente");
    } else {
        console.log("⚠️  No se pudo actualizar automáticamente. Configuración manual:");
        console.log("");
        console.log("const ARANDU_CONTRACTS = {");
        console.log(`  REGISTRAR: "${addresses.registrar}",`);
        console.log(`  ANDU_TOKEN: "${addresses.aranduToken}",`);
        console.log(`  CERTIFICATES: "${addresses.certificates}",`);
        console.log("  VERIFIERS: {");
        console.log(`    REGISTRATION: "${addresses.verifiers.registration}",`);
        console.log(`    MINT: "${addresses.verifiers.mint}",`);
        console.log(`    TRANSFER: "${addresses.verifiers.transfer}",`);
        console.log(`    BURN: "${addresses.verifiers.burn}",`);
        console.log(`    WITHDRAW: "${addresses.verifiers.withdraw}"`);
        console.log("  }");
        console.log("};");
    }
    console.log("");

    console.log("🌟 ¡DESPLIEGUE COMPLETADO! 🌟");
    
    return addresses;
}

// Ejecutar el script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error en el despliegue:", error);
        process.exit(1);
    });
