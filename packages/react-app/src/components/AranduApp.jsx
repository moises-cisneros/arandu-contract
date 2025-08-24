import { useState } from 'react';
import { ethers } from 'ethers';
import { NETWORKS, ARANDU_CONTRACTS, OWNER_CONFIG } from '../config/arandu-config.js';
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
    // Funciones básicas de EncryptedERC (simplificadas para demo)
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
];

const AranduApp = () => {
    const [_provider, setProvider] = useState(null);
    const [_signer, setSigner] = useState(null);
    const [userAddress, setUserAddress] = useState('');
    const [network, setNetwork] = useState('LOCALHOST');
    const [contracts, setContracts] = useState({});
    const [userRegistered, setUserRegistered] = useState(false);
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

    // Inicializar provider y signer basados en configuración (sin necesidad de wallet)
    const initConnection = async (selectedNetwork = network) => {
        try {
            setLoading(true);
            addLog('Inicializando conexión RPC...', 'info');

            const rpcUrl = NETWORKS[selectedNetwork]?.rpcUrl;
            if (!rpcUrl) {
                addLog('RPC URL no configurada para la red seleccionada', 'error');
                return;
            }

            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

            // Intentar leer private key de entorno (build-time): REACT_APP_FRONTEND_PRIVATE_KEY
            // Try to read frontend private key from env (REACT_APP_FRONTEND_PRIVATE_KEY)
            const frontendPrivateKey = (typeof window !== 'undefined' && window.__env && window.__env.REACT_APP_FRONTEND_PRIVATE_KEY)
                || null;

            let signer = null;
            let address = '';

            if (frontendPrivateKey) {
                try {
                    signer = new ethers.Wallet(frontendPrivateKey, provider);
                    address = await signer.getAddress();
                    addLog(`Frontend signer configurado: ${address.slice(0,6)}...${address.slice(-4)}`, 'success');
                } catch (err) {
                    addLog('Error creando signer desde private key del frontend: ' + err.message, 'error');
                }
            } else {
                // Si no hay private key, usar la dirección owner configurada para acciones "owner-only".
                address = OWNER_CONFIG[selectedNetwork]?.address || '';
                addLog(`Usando dirección configurada en config: ${address}`, 'info');
            }

            setProvider(provider);
            setSigner(signer);
            setUserAddress(address);

            // Inicializar contratos con el signer si existe, sino con provider (lectura)
            await initializeContracts(provider, signer || provider);

        } catch (error) {
            addLog(`Error inicializando conexión: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Inicializar contratos
    const initializeContracts = async (provider, signer) => {
        try {
            const networkContracts = ARANDU_CONTRACTS[network];

            const registrar = new ethers.Contract(
                networkContracts.REGISTRAR,
                REGISTRAR_ABI,
                signer
            );

            const certificates = new ethers.Contract(
                networkContracts.CERTIFICATES,
                CERTIFICATES_ABI,
                signer
            );

            const aranduToken = new ethers.Contract(
                networkContracts.ANDU_TOKEN,
                ENCRYPTED_ERC_ABI,
                signer
            );

            setContracts({ registrar, certificates, aranduToken });

            addLog('Contratos inicializados correctamente', 'success');

            // Verificar registro del usuario (solo lectura si hay address)
            await checkUserRegistration(registrar, userAddress);

        } catch (error) {
            addLog(`Error inicializando contratos: ${error.message}`, 'error');
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
    if (!_signer) {
            addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
            return;
        }

        try {
            setLoading(true);
            addLog('Registrando usuario en el sistema ARANDU...', 'info');

            const dummyPublicKey = ethers.utils.randomBytes(64);

            const tx = await contracts.registrar.register(dummyPublicKey);
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

    // Emitir certificado (solo si hay signer)
    const issueCertificate = async () => {
    if (!_signer) {
            addLog('Acción bloqueada: no hay signer configurado en el frontend.', 'warning');
            return;
        }

        try {
            if (!certificateName || !recipientAddress) {
                addLog('Por favor completa todos los campos', 'warning');
                return;
            }

            setLoading(true);
            addLog(`Emitiendo certificado "${certificateName}" para ${recipientAddress}...`, 'info');

            const uri = tokenURI || `https://arandu.example.com/certificates/${Date.now()}`;

            const tx = await contracts.certificates.issueCertificate(recipientAddress, certificateName, uri);
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

    // Obtener información de contratos
    const getContractInfo = async () => {
        try {
            setLoading(true);
            addLog('Obteniendo información de contratos...', 'info');

            if (contracts.certificates) {
                const name = await contracts.certificates.name();
                const symbol = await contracts.certificates.symbol();
                addLog(`Certificados: ${name} (${symbol})`, 'info');
            }

            if (contracts.aranduToken) {
                const tokenName = await contracts.aranduToken.name();
                const tokenSymbol = await contracts.aranduToken.symbol();
                addLog(`Token: ${tokenName} (${tokenSymbol})`, 'info');
            }

        } catch (error) {
            addLog(`Error obteniendo información: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="arandu-app">
            <header className="arandu-header">
                <h1>🎓 ARANDU - Plataforma EdTech Blockchain</h1>
                <p>Sistema de recompensas privadas y certificados NFT</p>
            </header>

            <div className="arandu-main">
                {/* Panel de Conexión */}
                <div className="panel">
                    <h2>🔌 Conexión</h2>
                        <div className="network-selector">
                            <label>Red:</label>
                            <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                                <option value="LOCALHOST">Localhost (Hardhat)</option>
                                <option value="FUJI">Avalanche Fuji</option>
                                <option value="AVALANCHE">Avalanche Mainnet</option>
                            </select>
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <button
                                onClick={() => initConnection(network)}
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? 'Inicializando...' : 'Inicializar Conexión (RPC)'}
                            </button>
                        </div>

                        {userAddress ? (
                            <div className="wallet-info">
                                <p><strong>Dirección:</strong> {userAddress}</p>
                                <p><strong>Red:</strong> {NETWORKS[network].name}</p>
                                <p><strong>Registrado:</strong> {userRegistered ? '✅ Sí' : '❌ No'}</p>
                            </div>
                        ) : null}
                </div>

                {/* Panel de Registro */}
                {userAddress && !userRegistered && (
                    <div className="panel">
                        <h2>📝 Registro de Usuario</h2>
                        <p>Regístrate en el sistema ARANDU para acceder a todas las funciones.</p>
                        <button
                            onClick={registerUser}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Registrando...' : 'Registrar Usuario'}
                        </button>
                    </div>
                )}

                {/* Panel de Certificados */}
                {userAddress && userRegistered && (
                    <div className="panel">
                        <h2>🏆 Emisión de Certificados</h2>
                        <div className="form-group">
                            <label>Nombre del logro:</label>
                            <input
                                type="text"
                                value={certificateName}
                                onChange={(e) => setCertificateName(e.target.value)}
                                placeholder="Ej: Completar Curso de Blockchain"
                            />
                        </div>
                        <div className="form-group">
                            <label>Dirección del destinatario:</label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <div className="form-group">
                            <label>URI del token (opcional):</label>
                            <input
                                type="text"
                                value={tokenURI}
                                onChange={(e) => setTokenURI(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <button
                            onClick={issueCertificate}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Emitiendo...' : 'Emitir Certificado'}
                        </button>
                    </div>
                )}

                {/* Panel de Información */}
                {userAddress && (
                    <div className="panel">
                        <h2>ℹ️ Información de Contratos</h2>
                        <button
                            onClick={getContractInfo}
                            disabled={loading}
                            className="btn btn-secondary"
                        >
                            {loading ? 'Cargando...' : 'Obtener Información'}
                        </button>
                        <div className="contract-addresses">
                            <h3>Direcciones de Contratos ({network}):</h3>
                            <ul>
                                <li><strong>Registrar:</strong> {ARANDU_CONTRACTS[network]?.REGISTRAR}</li>
                                <li><strong>Token ANDU:</strong> {ARANDU_CONTRACTS[network]?.ANDU_TOKEN}</li>
                                <li><strong>Certificados:</strong> {ARANDU_CONTRACTS[network]?.CERTIFICATES}</li>
                            </ul>
                        </div>
                    </div>
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
