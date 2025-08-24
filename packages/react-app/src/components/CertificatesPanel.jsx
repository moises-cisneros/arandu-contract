import React from 'react';

export default function CertificatesPanel({ userRegistered, certificateName, setCertificateName, recipientAddress, setRecipientAddress, tokenURI, setTokenURI, onIssue, loading, onRegister }) {
    return (
        <div className="panel">
            <h2>🏆 Emisión de Certificados</h2>
            {!userRegistered ? (
                <>
                    <p>Regístrate para emitir certificados.</p>
                    <button onClick={onRegister} disabled={loading} className="btn btn-primary">{loading ? 'Registrando...' : 'Registrar Usuario'}</button>
                </>
            ) : (
                <>
                    <div className="form-group">
                        <label>Nombre del logro:</label>
                        <input type="text" value={certificateName} onChange={(e) => setCertificateName(e.target.value)} placeholder="Ej: Completar Curso de Blockchain" />
                    </div>
                    <div className="form-group">
                        <label>Dirección del destinatario:</label>
                        <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="0x..." />
                    </div>
                    <div className="form-group">
                        <label>URI del token (opcional):</label>
                        <input type="text" value={tokenURI} onChange={(e) => setTokenURI(e.target.value)} placeholder="https://..." />
                    </div>
                    <button onClick={onIssue} disabled={loading} className="btn btn-primary">{loading ? 'Emitiendo...' : 'Emitir Certificado'}</button>
                </>
            )}
        </div>
    );
}
