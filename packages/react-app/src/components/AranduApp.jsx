import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORKS, ARANDU_CONTRACTS, OWNER_CONFIG, TEST_WALLETS } from '../config/arandu-config.js';
import { getFrontendNetwork } from '../utils/connection';
import CertificatesPanel from './CertificatesPanel';
import InfoPanel from './InfoPanel';
import * as conn from '../utils/connection';
import './AranduApp.css';

// ABIs simplificados para testing (solo las funciones que necesitamos)
const REGISTRAR_ABI = [
    "function register(bytes memory publicKey)",
    "function isUserRegistered(address user) view returns (bool)",
    "function getUserPublicKey(address user) view returns (bytes memory)"
];

const CERTIFICATES_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function issueCertificate(address to, string memory achievementName, string memory tokenURI) returns (uint256)",
    "function setBaseURI(string memory baseURI)",
    "function owner() view returns (address)"
];

const ENCRYPTED_ERC_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
];

const AranduApp = () => {
    const [_provider, setProvider] = useState(null);
    const [_signer, setSigner] = useState(null);
    const [userAddress, setUserAddress] = useState('');
    const defaultNet = getFrontendNetwork() || 'LOCALHOST';
    const [network, setNetwork] = useState(defaultNet);
    const [contracts, setContracts] = useState({});
    const [wallets, setWallets] = useState({
        owner: { address: OWNER_CONFIG.LOCALHOST.address },
        director: { address: TEST_WALLETS.director.address },
        docente: { address: TEST_WALLETS.docente.address }
    });
    const [balances, setBalances] = useState({ owner: {}, director: {}, docente: {} });
    const [mintAmount, setMintAmount] = useState('100');
    const [userRegistered, setUserRegistered] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState({ director: false, docente: false });
    const [sdkAvailable, setSdkAvailable] = useState(false);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);    // Estados para testing
    const [certificateName, setCertificateName] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [tokenURI, setTokenURI] = useState('');

    // Función para agregar logs
    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-9), { message, type, timestamp }]);
    };

    // Lazy connection: crear provider/signers y contratos bajo demanda
    const ensureConnectionAndContracts = async (selectedNetwork = network) => {
        try {
            setLoading(true);
            // Si ya hay contratos inicializados para esta red y provider, reutilizar
            if (_provider && contracts && Object.keys(contracts).length) {
                return { provider: _provider, signer: _signer, contracts };
            }

            addLog('Resolviendo RPC y configurando conexión...', 'info');
            let rpcUrl = conn.resolveRpcUrl(selectedNetwork, NETWORKS);
            if (!rpcUrl) {
                // intentar tomar rpcUrl desde ARANDU_CONTRACTS (algunos usuarios lo guardan ahí)
                rpcUrl = ARANDU_CONTRACTS[selectedNetwork]?.rpcUrl || ARANDU_CONTRACTS[selectedNetwork]?.RPC || null;
                if (rpcUrl) addLog('RPC URL encontrada en ARANDU_CONTRACTS (fallback)', 'info');
            }

            if (!rpcUrl) {
                addLog(`RPC URL no configurada para la red seleccionada (${selectedNetwork}). Revisa .env REACT_APP_${selectedNetwork}_RPC_URL o la configuración de NETWORKS.`, 'error');
                return false;
            }

            const provider = await conn.createProvider(rpcUrl);
            const frontendPrivateKey = conn.getFrontendPrivateKey();
            let signer = null;
            let address = '';

            if (frontendPrivateKey) {
                signer = await conn.createSigner(frontendPrivateKey, provider);
                try {
                    address = await signer.getAddress();
                } catch (errGet) {
                    addLog('No se pudo obtener dirección del signer: ' + (errGet.message || errGet), 'warning');
                }
                addLog(`Frontend signer configurado: ${address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'unknown'}`, 'success');
            } else {
                address = OWNER_CONFIG[selectedNetwork]?.address || '';
                addLog(`Usando dirección configurada en config: ${address}`, 'info');
            }

            setProvider(provider);
            setSigner(signer);
            setUserAddress(address);

            // Sincronizar la dirección del owner en el estado de wallets para mostrarla en UI
            setWallets(prev => ({
                ...prev,
                owner: { ...(prev.owner || {}), address: address || OWNER_CONFIG[selectedNetwork]?.address }
            }));

            // Inicializar contratos con signer si existe, sino con provider
            const initializedContracts = await initializeContracts(provider, signer || provider, selectedNetwork, address);
            return { provider, signer, contracts: initializedContracts };
        } catch (error) {
            addLog(`Error creando conexión: ${error.message}`, 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Carga de despliegues/abis y wallets (intenta leer archivos JSON incluidos en el bundle)
    const loadEnvironmentConfig = async (selectedNetwork = network) => {
        try {
            addLog('Cargando configuración del entorno...', 'info');

            // Intentar cargar ABIs desde src/abis
            try {
                await import(`../abis/EncryptedERC.json`);
            } catch {
                addLog('No se pudo cargar ABI EncryptedERC desde src/abis', 'warning');
            }

            try {
                await import(`../abis/AranduCertificate.json`);
            } catch {
                addLog('No se pudo cargar ABI AranduCertificate desde src/abis', 'warning');
            }

            // Intentar cargar test-wallets.json (solo si el repo lo incluye y el bundler lo permite)
            try {
                const walletsMod = await import('../../../hardhat/wallets/test-wallets.json');
                const data = walletsMod?.default || walletsMod;
                if (data?.wallets && data.wallets.length >= 2) {
                    setWallets(prev => ({
                        ...prev,
                        director: { address: data.wallets[0].address, privateKey: data.wallets[0].privateKey },
                        docente: { address: data.wallets[1].address, privateKey: data.wallets[1].privateKey }
                    }));
                    addLog('Wallets de prueba cargadas desde hardhat/wallets/test-wallets.json', 'success');
                }
            } catch {
                addLog('No se encontró test-wallets.json en el bundle; usando direcciones de `arandu-config`', 'info');
            }

            // Inicializar provider y contratos con owner signer usando ensureConnectionAndContracts
            await ensureConnectionAndContracts(selectedNetwork);

            // Detectar si el SDK de eERC está disponible en runtime
            try {
                const sdk = await import(/* @vite-ignore */ '@avalabs/eerc-sdk');
                if (sdk) setSdkAvailable(true);
            } catch {
                setSdkAvailable(false);
            }

            // Refrescar estados de registro
            await refreshRegistrationStatus();

            // Refrescar balances iniciales
            await refreshBalances();

        } catch (error) {
            addLog(`Error cargando config del entorno: ${error.message}`, 'error');
        }
    };

    useEffect(() => {
        // Cargar configuración cuando cambia la red
        loadEnvironmentConfig(network);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [network]);

    // Refrescar balances: AVAX, NFT balanceOf, ANDU encrypted balanceOfStandalone
    const refreshBalances = async () => {
        try {
            setLoading(true);
            const connection = await ensureConnectionAndContracts(network);
                    if (!connection) {
                        addLog('No se pudo conectar para refrescar balances', 'error');
                        return;
                    }

            const provider = connection.provider;
            const cert = connection.contracts.certificates;
            const token = connection.contracts.aranduToken;

            const keys = ['owner', 'director', 'docente'];
            const next = {};
            for (const k of keys) {
                const w = wallets[k];
                if (!w || !w.address) {
                    next[k] = { avax: 'N/A', nft: 'N/A', andu: 'N/A' };
                    continue;
                }

                // AVAX
                let avax = 'N/A';
                try { const b = await provider.getBalance(w.address); avax = ethers.formatEther ? ethers.formatEther(b) : ethers.utils.formatEther(b); } catch { avax = 'N/A'; }

                // NFT balance
                let nft = 'N/A';
                try { if (cert) nft = (await cert.balanceOf(w.address)).toString(); } catch { nft = 'N/A'; }

                // ANDU encrypted balance
                let andu = 'Privado';
                try {
                    if (token && token.balanceOfStandalone) {
                        const res = await token.balanceOfStandalone(w.address);
                        // res.eGCT exists; cannot decode without eERC SDK and decryption key
                        andu = 'Privado (encrypted)';
                        // If decryptionKey present in localStorage, attempt decode with eERC SDK
                        const dk = localStorage.getItem(`decryptionKey:${w.address}`);
                        if (dk) {
                            try {
                                const sdk = await import(/* @vite-ignore */ '@avalabs/eerc-sdk');
                                if (sdk && sdk.useEncryptedBalance) {
                                    const dec = await sdk.useEncryptedBalance().decrypt(res, dk);
                                    andu = dec?.toString?.() || '0';
                                } else {
                                    andu = 'Privado (SDK incompatible)';
                                }
                            } catch {
                                andu = 'Privado (SDK no instalado)';
                            }
                        }
                    } else {
                        andu = token ? 'N/A' : 'N/A';
                    }
                } catch {
                    andu = 'N/A';
                }

                next[k] = { avax, nft, andu };
            }

            setBalances(next);
            addLog('Balances actualizados', 'success');

        } catch (error) {
            addLog(`Error actualizando balances: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Refrescar estado de registro para director y docente
    const refreshRegistrationStatus = async () => {
        try {
            const connection = await ensureConnectionAndContracts(network);
            if (!connection || !connection.contracts || !connection.contracts.registrar) return;
            const registrar = connection.contracts.registrar;
            const dir = wallets.director?.address;
            const doc = wallets.docente?.address;
            let dirReg = false;
            let docReg = false;
            try { if (dir) dirReg = await registrar.isUserRegistered(dir); } catch { dirReg = false; }
            try { if (doc) docReg = await registrar.isUserRegistered(doc); } catch { docReg = false; }
            setRegistrationStatus({ director: !!dirReg, docente: !!docReg });
            addLog('Estado de registro actualizado', 'info');
        } catch (e) {
            addLog('No se pudo actualizar estado de registro: ' + (e?.message || e), 'warning');
        }
    };

    // Registrar docente (demo fallback): registra con dummy key y guarda fake decryptionKey
    const registerDocenteDemo = async () => {
        try {
            setLoading(true);
            addLog("Registrando docente (demo)...", 'info');
            const connection = await ensureConnectionAndContracts(network);
            if (!connection || !connection.contracts || !connection.signer) {
                addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
                return;
            }
            const registrar = connection.contracts.registrar;
            const docenteAddr = wallets.docente.address;
            const dummy = ethers.utils.randomBytes(64);
            const tx = await registrar.register(dummy);
            addLog(`Registro tx enviada: ${tx.hash}`, 'info');
            await tx.wait();
            const fakeKey = `demo-dek-${docenteAddr}`;
            localStorage.setItem(`decryptionKey:${docenteAddr}`, fakeKey);
            addLog('Registro demo completado; decryptionKey guardada en localStorage', 'success');
            await refreshRegistrationStatus();
        } catch (e) {
            addLog('Error en registro demo: ' + (e?.message || e), 'error');
        } finally { setLoading(false); }
    };

    // Intentar registrar usando SDK en runtime (solo detecta y explica si no puede)
    const registerDocenteWithSdk = async () => {
        try {
            setLoading(true);
            addLog('Intentando registrar docente con eERC SDK...', 'info');
            const sdk = await import(/* @vite-ignore */ '@avalabs/eerc-sdk');
            if (!sdk) throw new Error('SDK no disponible');
            // No asumimos API exacta; informamos al usuario y sugerimos integrar llamada concreta
            addLog('SDK cargado. Implementa la función específica del SDK para generar la prueba de registro y la decryptionKey.', 'info');
            // placeholder: if SDK provided a function, here se llamaría y se guardaría la decryptionKey
        } catch (e) {
            addLog('No se pudo usar el SDK para registrar: ' + (e?.message || e), 'error');
        } finally { setLoading(false); }
    };

    // Registro + mint privado (usado por InfoPanel)
    const registerAndMintForDocente = async (amount) => {
        try {
            setLoading(true);
            addLog('Iniciando otorgamiento de tokens ANDU privados...', 'info');

            const connection = await ensureConnectionAndContracts(network);
            if (!connection || !connection.contracts) {
                addLog('No hay contratos listos', 'error');
                return;
            }

            const registrar = connection.contracts.registrar;
            const token = connection.contracts.aranduToken;
            const docenteAddr = wallets.docente.address;

            // Check registration
            let isReg = false;
            try { isReg = await registrar.isUserRegistered(docenteAddr); } catch (e) { addLog('No se pudo consultar isUserRegistered: ' + e.message, 'warning'); }

            if (!isReg) {
                addLog(`Registrando billetera 'docente'...`, 'info');
                // Generate a dummy public key for demo (real flow requiere eERC SDK)
                const dummy = ethers.utils.randomBytes(64);
                const tx = await registrar.register(dummy);
                addLog(`Registro tx enviada: ${tx.hash}`, 'info');
                await tx.wait();
                // Store a fake decryptionKey for demo purposes
                const fakeKey = `demo-dek-${docenteAddr}`;
                localStorage.setItem(`decryptionKey:${docenteAddr}`, fakeKey);
                addLog('Registro completado; decryptionKey guardada (demo)', 'success');
            }

            // Mint privado: requiere eERC SDK para generar MintProof
            try {
                const sdk = await import(/* @vite-ignore */ '@avalabs/eerc-sdk');
                if (!sdk) throw new Error('SDK inválido');
                addLog('Generando prueba de Mint con eERC SDK...', 'info');
                // Este código es indicativo; el SDK real puede usar otra API
                const amountBn = ethers.utils.parseUnits(amount.toString(), 18);
                const proof = await sdk.useEncryptedBalance().generateMintProof(docenteAddr, amountBn);
                const tx = await token.privateMint(docenteAddr, proof);
                addLog(`privateMint tx enviada: ${tx.hash}`, 'info');
                await tx.wait();
                addLog('privateMint confirmada', 'success');
            } catch {
                addLog('eERC SDK no disponible o falla: instala @avalabs/eerc-sdk y usa su API para generar pruebas', 'error');
                return;
            }

            // Refrescar balances
            await refreshBalances();

        } catch (error) {
            addLog(`Error en registro/mint: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Inicializar contratos
    const initializeContracts = async (provider, signer, selectedNetwork = network, address = '') => {
        try {


            // Preferir cargar la dirección y ABI desde los JSON generados en src/abis
            let registrarAddress = ARANDU_CONTRACTS[selectedNetwork]?.REGISTRAR;
            let certificatesAddress = ARANDU_CONTRACTS[selectedNetwork]?.CERTIFICATES;
            let anduAddress = ARANDU_CONTRACTS[selectedNetwork]?.ANDU_TOKEN;

            let registrarAbi = REGISTRAR_ABI;
            let certificatesAbi = CERTIFICATES_ABI;
            let encryptedErcAbi = ENCRYPTED_ERC_ABI;

            try {
                const regMod = await import(`../abis/Registrar.json`);
                const regJson = regMod?.default || regMod;
                if (regJson?.abi) registrarAbi = regJson.abi;
                if (regJson?.address) registrarAddress = regJson.address;
            } catch (e) {
                addLog('No se pudo cargar ABI/dirección de Registrar desde src/abis: ' + (e?.message || e), 'warning');
            }

            try {
                const certMod = await import(`../abis/AranduCertificate.json`);
                const certJson = certMod?.default || certMod;
                if (certJson?.abi) certificatesAbi = certJson.abi;
                if (certJson?.address) certificatesAddress = certJson.address;
            } catch (e) {
                addLog('No se pudo cargar ABI/dirección de AranduCertificate desde src/abis: ' + (e?.message || e), 'warning');
            }

            try {
                const tokenMod = await import(`../abis/EncryptedERC.json`);
                const tokenJson = tokenMod?.default || tokenMod;
                if (tokenJson?.abi) encryptedErcAbi = tokenJson.abi;
                if (tokenJson?.address) anduAddress = tokenJson.address;
            } catch (e) {
                addLog('No se pudo cargar ABI/dirección de EncryptedERC desde src/abis: ' + (e?.message || e), 'warning');
            }

            const registrar = new ethers.Contract(registrarAddress, registrarAbi, signer);
            const certificates = new ethers.Contract(certificatesAddress, certificatesAbi, signer);
            const aranduToken = new ethers.Contract(anduAddress, encryptedErcAbi, signer);

            const contractsObj = { registrar, certificates, aranduToken };
            setContracts(contractsObj);

            addLog('Contratos inicializados correctamente', 'success');

            // Verificar registro del usuario (solo lectura si hay address)
            await checkUserRegistration(registrar, address || userAddress);

            return contractsObj;

        } catch (error) {
            addLog(`Error inicializando contratos: ${error.message}`, 'error');
            return null;
        }
    };

    // Verificar registro del usuario
    const checkUserRegistration = async (registrarContract, address) => {
        try {
            if (!registrarContract || !address) return;

            const isRegistered = await registrarContract.isUserRegistered(address);
            setUserRegistered(isRegistered);

            if (isRegistered) {
                addLog('Usuario registrado en el sistema ARANDU', 'success');
            } else {
                addLog('Usuario no registrado. Regístrate para usar el sistema.', 'warning');
            }
        } catch (error) {
            addLog(`Error verificando registro: ${error.message}`, 'error');
        }
    };

    // Registrar usuario (solo si hay signer)
    const registerUser = async () => {
        try {
            setLoading(true);

            const connection = await ensureConnectionAndContracts();
            if (!connection || !connection.signer) {
                addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
                return;
            }

            addLog('Registrando usuario en el sistema ARANDU...', 'info');

            const dummyPublicKey = ethers.utils.randomBytes(64);

            const tx = await connection.contracts.registrar.register(dummyPublicKey);
            addLog(`Transacción enviada: ${tx.hash}`, 'info');

            const receipt = await tx.wait();
            addLog(`Registro completado en bloque: ${receipt.blockNumber}`, 'success');

            setUserRegistered(true);

        } catch (error) {
            addLog(`Error en registro: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Emitir certificado desde la wallet "director" (owner firma la tx)
    const issueCertificateFromDirector = async (achievementName = 'Certificado de Prueba', recipient = TEST_WALLETS.docente.address, uri = '') => {
        try {
            setLoading(true);

            const connection = await ensureConnectionAndContracts(network);
            if (!connection || !connection.signer) {
                addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
                return;
            }

            const tokenUri = uri || `https://arandu.example.com/certificates/${Date.now()}`;
            addLog(`Emitiendo certificado (director → docente) "${achievementName}" a ${recipient}...`, 'info');

            const tx = await connection.contracts.certificates.issueCertificate(recipient, achievementName, tokenUri);
            addLog(`Transacción enviada: ${tx.hash}`, 'info');

            const receipt = await tx.wait();
            addLog(`Certificado emitido en bloque: ${receipt.blockNumber}`, 'success');

        } catch (error) {
            addLog(`Error emitiendo certificado (director): ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Dar tokens ANDU desde owner → docente (intenta usar transfer, captura error si no existe)
    const giveAnduToDocente = async (amount = '100') => {
        try {
            setLoading(true);

            const connection = await ensureConnectionAndContracts(network);
            if (!connection || !connection.signer) {
                addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
                return;
            }

            const recipient = TEST_WALLETS.docente.address;
            addLog(`Enviando ${amount} ANDU a ${recipient}...`, 'info');

            // Intentar llamar a transfer; si el contrato expone otro método, el catch lo informará
            const parsed = ethers.utils.parseUnits ? ethers.utils.parseUnits(amount.toString(), 18) : ethers.parseUnits(amount.toString(), 18);
            let tx;
            try {
                tx = await connection.contracts.aranduToken.transfer(recipient, parsed);
            } catch (errTransfer) {
                addLog('Transfer falló: ' + (errTransfer.message || errTransfer) + '. Intenta mint/otros métodos desde backend.', 'warning');
                return;
            }

            addLog(`Transacción enviada: ${tx.hash}`, 'info');
            const receipt = await tx.wait();
            addLog(`Tokens ANDU enviados en bloque: ${receipt.blockNumber}`, 'success');

        } catch (error) {
            addLog(`Error enviando ANDU: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Comprobar balances AVAX y ANDU de las wallets de prueba
    const checkTestBalances = async () => {
        try {
            setLoading(true);
            const connection = await ensureConnectionAndContracts(network);
            if (!connection) {
                addLog('No se pudo conectar para consultar balances', 'error');
                return;
            }

            const provider = connection.provider;
            const token = connection.contracts.aranduToken;

            for (const key of Object.keys(TEST_WALLETS)) {
                const w = TEST_WALLETS[key];
                const avax = await provider.getBalance(w.address);
                let anduBal = 'N/A';
                try {
                    anduBal = token ? (await token.balanceOf(w.address)).toString() : 'N/A';
                } catch {
                    anduBal = 'N/A';
                }
                addLog(`${w.name} ${w.address} — AVAX: ${ethers.formatEther ? ethers.formatEther(avax) : ethers.utils.formatEther(avax)} — ANDU: ${anduBal}`, 'info');
            }

        } catch (error) {
            addLog(`Error consultando balances: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Emitir certificado (solo si hay signer)
    const issueCertificate = async () => {
        try {
            if (!certificateName || !recipientAddress) {
                addLog('Por favor completa todos los campos', 'warning');
                return;
            }

            setLoading(true);

            const connection = await ensureConnectionAndContracts();
            if (!connection || !connection.signer) {
                addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
                return;
            }

            addLog(`Emitiendo certificado "${certificateName}" para ${recipientAddress}...`, 'info');

            const uri = tokenURI || `https://arandu.example.com/certificates/${Date.now()}`;

            const tx = await connection.contracts.certificates.issueCertificate(recipientAddress, certificateName, uri);
            addLog(`Transacción enviada: ${tx.hash}`, 'info');

            const receipt = await tx.wait();
            addLog(`Certificado emitido en bloque: ${receipt.blockNumber}`, 'success');

            setCertificateName('');
            setRecipientAddress('');
            setTokenURI('');

        } catch (error) {
            addLog(`Error emitiendo certificado: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // (getContractInfo removed — use Refresh Balances / Logs)

    return (
        <div className="arandu-app">
            <header className="arandu-header">
                <h1>🎓 ARANDU - Plataforma EdTech Blockchain</h1>
                <p>Sistema de recompensas privadas y certificados NFT</p>
            </header>

            <div className="arandu-main">
                {/* Connection initialized lazily on-demand; selector and test-flow panel below */}

                <div className="panel">
                    <h2>⚙️ Acciones Disponibles</h2>
                    <div className="network-selector">
                        <label>Red:</label>
                        <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                            <option value="LOCALHOST">Localhost (Hardhat)</option>
                            <option value="FUJI">Avalanche Fuji</option>
                        </select>
                    </div>
                    <p>Wallets de prueba: <strong>{TEST_WALLETS.director.name}</strong> → <strong>{TEST_WALLETS.docente.name}</strong></p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => issueCertificateFromDirector()} disabled={loading} className="btn btn-primary">Emitir certificado (director → docente)</button>
                        <button onClick={() => giveAnduToDocente()} disabled={loading} className="btn btn-primary">Enviar ANDU (owner → docente)</button>
                        <button onClick={() => checkTestBalances()} disabled={loading} className="btn btn-secondary">Consultar balances de prueba</button>
                    </div>
                </div>

                {userAddress && !userRegistered && (
                    <CertificatesPanel
                        userRegistered={userRegistered}
                        certificateName={certificateName}
                        setCertificateName={setCertificateName}
                        recipientAddress={recipientAddress}
                        setRecipientAddress={setRecipientAddress}
                        tokenURI={tokenURI}
                        setTokenURI={setTokenURI}
                        onIssue={issueCertificate}
                        loading={loading}
                        onRegister={registerUser}
                    />
                )}

                {userAddress && userRegistered && (
                    <CertificatesPanel
                        userRegistered={userRegistered}
                        certificateName={certificateName}
                        setCertificateName={setCertificateName}
                        recipientAddress={recipientAddress}
                        setRecipientAddress={setRecipientAddress}
                        tokenURI={tokenURI}
                        setTokenURI={setTokenURI}
                        onIssue={issueCertificate}
                        loading={loading}
                        onRegister={registerUser}
                    />
                )}

                {userAddress && (
                    <InfoPanel
                        networkName={network}
                        wallets={wallets}
                        balances={balances}
                        onRefreshBalances={refreshBalances}
                        onIssueCert={() => issueCertificateFromDirector()}
                        onMintAndu={(amt) => registerAndMintForDocente(amt)}
                        mintAmount={mintAmount}
                        setMintAmount={setMintAmount}
                        loading={loading}
                        registrationStatus={registrationStatus}
                        sdkAvailable={sdkAvailable}
                        onRegisterDemo={registerDocenteDemo}
                        onRegisterSdk={registerDocenteWithSdk}
                    />
                )}

                {/* Panel de Logs */}
                <div className="panel logs-panel">
                    <h2>📋 Registro de Actividad</h2>
                    <div className="logs">
                        {logs.length === 0 ? (
                            <p className="no-logs">No hay actividad registrada</p>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className={`log-entry log-${log.type}`}>
                                    <span className="log-time">[{log.timestamp}]</span>
                                    <span className="log-message">{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AranduApp;
