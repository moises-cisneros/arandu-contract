import pkg from "hardhat";
const { ethers } = pkg;

/**
 * Script de despliegue completo para el ecosistema ARANDU
 * 
 * Despliega en el siguiente orden:
 * 1. Contratos Verificadores (ZK Proof Verifiers)
 * 2. Contrato Registrar 
 * 3. Token "ANDU" (EncryptedERC)
 * 4. Contrato de Certificados (AranduCertificate) - si no existe
 * 
 * Configurado para la Testnet Fuji de Avalanche
 */
const deployAranduEcosystem = async (hre) => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("🌟 ======== DESPLIEGUE DEL ECOSISTEMA ARANDU ========");
    console.log("📋 Red:", hre.network.name);
    console.log("📋 Deployer:", deployer);
    console.log("📋 Chain ID:", hre.network.config.chainId);
    console.log("");

    // ===============================================
    // PASO 1: DESPLEGAR CONTRATOS VERIFICADORES
    // ===============================================
    console.log("🔐 PASO 1: Desplegando Contratos Verificadores ZK...");
    
    // 1.1 Registration Verifier
    console.log("   📝 Desplegando RegistrationCircuitGroth16Verifier...");
    const registrationVerifier = await deploy("RegistrationCircuitGroth16Verifier", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ RegistrationVerifier:", registrationVerifier.address);

    // 1.2 Mint Verifier 
    console.log("   🪙 Desplegando MintCircuitGroth16Verifier...");
    const mintVerifier = await deploy("MintCircuitGroth16Verifier", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ MintVerifier:", mintVerifier.address);

    // 1.3 Transfer Verifier
    console.log("   📮 Desplegando TransferCircuitGroth16Verifier...");
    const transferVerifier = await deploy("TransferCircuitGroth16Verifier", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ TransferVerifier:", transferVerifier.address);

    // 1.4 Burn Verifier
    console.log("   🔥 Desplegando BurnCircuitGroth16Verifier...");
    const burnVerifier = await deploy("BurnCircuitGroth16Verifier", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ BurnVerifier:", burnVerifier.address);

    // 1.5 Withdraw Verifier
    console.log("   💸 Desplegando WithdrawCircuitGroth16Verifier...");
    const withdrawVerifier = await deploy("WithdrawCircuitGroth16Verifier", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ WithdrawVerifier:", withdrawVerifier.address);

    console.log("");

    // ===============================================
    // PASO 2: DESPLEGAR CONTRATO REGISTRAR
    // ===============================================
    console.log("👤 PASO 2: Desplegando Contrato Registrar...");
    
    const registrar = await deploy("Registrar", {
        from: deployer,
        args: [registrationVerifier.address],
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ Registrar:", registrar.address);
    console.log("");

    // ===============================================
    // PASO 3: DESPLEGAR TOKEN "ANDU" (EncryptedERC)
    // ===============================================
    console.log("🪙 PASO 3: Desplegando Token ANDU (EncryptedERC)...");
    
    // Preparar parámetros para CreateEncryptedERCParams
    const createEncryptedERCParams = {
        registrar: registrar.address,
        isConverter: false, // Modo Standalone como se especifica
        name: "Arandu Token",
        symbol: "ANDU", 
        decimals: 18,
        mintVerifier: mintVerifier.address,
        withdrawVerifier: withdrawVerifier.address,
        transferVerifier: transferVerifier.address,
        burnVerifier: burnVerifier.address
    };

    console.log("   📋 Parámetros del Token ANDU:");
    console.log("      - Nombre:", createEncryptedERCParams.name);
    console.log("      - Símbolo:", createEncryptedERCParams.symbol);
    console.log("      - Modo:", createEncryptedERCParams.isConverter ? "Converter" : "Standalone");
    console.log("      - Registrar:", createEncryptedERCParams.registrar);

    // Desplegar librería BabyJubJub primero
    console.log("   📚 Desplegando librería BabyJubJub...");
    const babyJubJub = await deploy("BabyJubJub", {
        from: deployer,
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ BabyJubJub:", babyJubJub.address);

    const aranduToken = await deploy("EncryptedERC", {
        from: deployer,
        args: [createEncryptedERCParams],
        libraries: {
            BabyJubJub: babyJubJub.address,
        },
        log: true,
        waitConfirmations: hre.network.live ? 3 : 1,
    });
    console.log("   ✅ Token ANDU (EncryptedERC):", aranduToken.address);
    console.log("");

    // ===============================================
    // PASO 4: VERIFICAR/DESPLEGAR CERTIFICADOS NFT
    // ===============================================
    console.log("🏆 PASO 4: Verificando Contrato de Certificados...");
    
    let certificateContract;
    try {
        // Intentar obtener el contrato existente
        certificateContract = await get("AranduCertificate");
        console.log("   ✅ AranduCertificate ya existe:", certificateContract.address);
    } catch (error) {
        // Si no existe, desplegarlo
        console.log("   📝 Desplegando AranduCertificate...");
        certificateContract = await deploy("AranduCertificate", {
            from: deployer,
            args: [deployer], // initialOwner = deployer
            log: true,
            waitConfirmations: hre.network.live ? 3 : 1,
        });
        console.log("   ✅ AranduCertificate desplegado:", certificateContract.address);
    }
    console.log("");

    // ===============================================
    // RESUMEN FINAL
    // ===============================================
    console.log("🎉 ======== RESUMEN DEL DESPLIEGUE ========");
    console.log("");
    console.log("🔐 VERIFICADORES ZK:");
    console.log("   📝 Registration:", registrationVerifier.address);
    console.log("   🪙 Mint:", mintVerifier.address);
    console.log("   📮 Transfer:", transferVerifier.address); 
    console.log("   🔥 Burn:", burnVerifier.address);
    console.log("   💸 Withdraw:", withdrawVerifier.address);
    console.log("");
    console.log("👤 SISTEMA DE IDENTIDAD:");
    console.log("   📋 Registrar:", registrar.address);
    console.log("");
    console.log("🪙 TOKEN PRIVADO ANDU:");
    console.log("   💰 EncryptedERC (ANDU):", aranduToken.address);
    console.log("   📊 Modo: Standalone");
    console.log("   🔒 Privacidad: Habilitada");
    console.log("");
    console.log("🏆 CERTIFICADOS NFT:");
    console.log("   🎓 AranduCertificate:", certificateContract.address);
    console.log("");

    // ===============================================
    // VERIFICACIÓN EN EXPLORADORES (REDES EN VIVO)
    // ===============================================
    if (hre.network.live && (process.env.SNOWTRACE_API_KEY || process.env.ETHERSCAN_V2_API_KEY)) {
        console.log("🔍 Iniciando verificación en exploradores...");
        
        const contractsToVerify = [
            {
                name: "RegistrationCircuitGroth16Verifier",
                address: registrationVerifier.address,
                args: []
            },
            {
                name: "MintCircuitGroth16Verifier", 
                address: mintVerifier.address,
                args: []
            },
            {
                name: "TransferCircuitGroth16Verifier",
                address: transferVerifier.address,
                args: []
            },
            {
                name: "BurnCircuitGroth16Verifier",
                address: burnVerifier.address,
                args: []
            },
            {
                name: "WithdrawCircuitGroth16Verifier",
                address: withdrawVerifier.address,
                args: []
            },
            {
                name: "Registrar",
                address: registrar.address,
                args: [registrationVerifier.address]
            },
            {
                name: "EncryptedERC",
                address: aranduToken.address,
                args: [createEncryptedERCParams]
            },
            {
                name: "AranduCertificate",
                address: certificateContract.address,
                args: [deployer]
            }
        ];

        for (const contract of contractsToVerify) {
            try {
                console.log(`   🔍 Verificando ${contract.name}...`);
                await hre.run("verify:verify", {
                    address: contract.address,
                    constructorArguments: contract.args,
                });
                console.log(`   ✅ ${contract.name} verificado exitosamente`);
            } catch (error) {
                console.log(`   ⚠️  Error verificando ${contract.name}:`, error.message);
                // Continuar con otros contratos aunque uno falle
            }
        }
    }

    // ===============================================
    // INSTRUCCIONES PARA EL FRONTEND
    // ===============================================
    console.log("");
    console.log("📱 ======== CONFIGURACIÓN PARA FRONTEND ========");
    console.log("");
    console.log("Para configurar el eERC SDK en tu aplicación React:");
    console.log("");
    console.log("1. Instalar el SDK:");
    console.log("   npm install @avalabs/eerc-sdk");
    console.log("");
    console.log("2. Configurar las direcciones de contratos:");
    console.log("   const ARANDU_CONTRACTS = {");
    console.log(`     REGISTRAR: "${registrar.address}",`);
    console.log(`     ANDU_TOKEN: "${aranduToken.address}",`);
    console.log(`     CERTIFICATES: "${certificateContract.address}",`);
    console.log("     VERIFIERS: {");
    console.log(`       REGISTRATION: "${registrationVerifier.address}",`);
    console.log(`       MINT: "${mintVerifier.address}",`);
    console.log(`       TRANSFER: "${transferVerifier.address}",`);
    console.log(`       BURN: "${burnVerifier.address}",`);
    console.log(`       WITHDRAW: "${withdrawVerifier.address}"`);
    console.log("     }");
    console.log("   };");
    console.log("");
    console.log("3. Configurar el provider del SDK:");
    console.log("   import { useEERC } from '@avalabs/eerc-sdk';");
    console.log("");
    console.log("4. Flujo de uso recomendado:");
    console.log("   - Registro: useEERC().isUserRegistered() → register()");
    console.log("   - Mint: useEncryptedBalance().privateMint(address, amount)");
    console.log("   - Balance: useEncryptedBalance().balanceOfStandalone()");
    console.log("   - Certificados: AranduCertificate.issueCertificate(address)");
    console.log("");

    console.log("🌟 ¡DESPLIEGUE COMPLETADO EXITOSAMENTE! 🌟");
    
    return {
        registrationVerifier: registrationVerifier.address,
        mintVerifier: mintVerifier.address,
        transferVerifier: transferVerifier.address,
        burnVerifier: burnVerifier.address,
        withdrawVerifier: withdrawVerifier.address,
        registrar: registrar.address,
        aranduToken: aranduToken.address,
        certificates: certificateContract.address
    };
};

// Configuración para hardhat-deploy
deployAranduEcosystem.tags = ["AranuEcosystem", "EncryptedERC", "ANDU"];
deployAranduEcosystem.dependencies = []; // No depende de otros scripts

export default deployAranduEcosystem;
