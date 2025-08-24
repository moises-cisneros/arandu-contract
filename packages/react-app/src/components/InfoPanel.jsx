import React from 'react';

export default function InfoPanel({
    networkName,
    wallets = {}, // { owner, director, docente } each { address }
    balances = {}, // { owner: { avax, nft, andu }, director: {...}, docente: {...} }
    onRefreshBalances,
    onIssueCert,
    onMintAndu,
    mintAmount,
    setMintAmount,
    loading
    , registrationStatus, sdkAvailable, onRegisterDemo, onRegisterSdk
}) {
    const checkDecryptionKey = (addr) => {
        try { return !!localStorage.getItem(`decryptionKey:${addr}`); } catch { return false; }
    };
    const WalletCard = ({ title, addr, bal }) => (
        <div className="wallet-card">
            <h4>{title}</h4>
            <p className="mono">{addr || 'N/A'}</p>
            <ul>
                <li><strong>AVAX:</strong> {bal?.avax ?? 'N/A'}</li>
                <li><strong>NFTs:</strong> {bal?.nft ?? 'N/A'}</li>
                <li><strong>ANDU:</strong> {bal?.andu ?? 'Privado / N/A'}</li>
                <li><strong>Registrado:</strong> {checkDecryptionKey(addr) ? 'Sí (clave disponible)' : 'No / Sin clave'}</li>
            </ul>
            <div style={{ marginTop: 6 }}>
                <button onClick={() => { navigator.clipboard?.writeText(addr); }} className="btn btn-ghost">Copiar dirección</button>
            </div>
        </div>
    );

    return (
        <div className="panel">
            <h2>ℹ️ Información de Contratos y Billeteras ({networkName})</h2>

            <div className="wallets-grid">
                <WalletCard title="Owner" addr={wallets.owner?.address} bal={balances.owner} />
                <WalletCard title="Director" addr={wallets.director?.address} bal={balances.director} />
                <WalletCard title="Docente" addr={wallets.docente?.address} bal={balances.docente} />
            </div>

            <div style={{ marginTop: 8 }} className="actions-row">
                <button onClick={onRefreshBalances} disabled={loading} className="btn btn-secondary">{loading ? 'Actualizando...' : 'Refrescar Balances'}</button>
            </div>

            <div style={{ marginTop: 8 }}>
                <h4>Registro (eERC)</h4>
                <p>Director: {registrationStatus?.director ? 'Registrado' : 'No' } — Docente: {registrationStatus?.docente ? 'Registrado' : 'No'}</p>
                <p>SDK disponible: {sdkAvailable ? 'Sí' : 'No'}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onRegisterDemo} disabled={loading} className="btn">Registrar Docente (Demo)</button>
                    <button onClick={onRegisterSdk} disabled={loading || !sdkAvailable} className="btn">Registrar Docente (SDK)</button>
                </div>
            </div>

            <div className="panel actions-panel" style={{ marginTop: 12 }}>
                <h3>Acciones del Director</h3>
                <div className="form-group">
                    <label>Cantidad ANDU a otorgar:</label>
                    <input type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} min="0" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onIssueCert} disabled={loading} className="btn btn-primary">Emitir Certificado NFT a Docente</button>
                    <button onClick={() => onMintAndu(mintAmount)} disabled={loading} className="btn btn-primary">Otorgar Tokens ANDU a Docente</button>
                </div>
            </div>

        </div>
    );
}
