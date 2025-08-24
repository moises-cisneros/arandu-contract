const fs = require('fs');
const path = require('path');
const hh = require('hardhat');
const u = require('./update-frontend-config');

(async () => {
    try {
        const summaryPath = path.join(__dirname, '..', 'deployment-unknown-1755990929903.json');
        if (!fs.existsSync(summaryPath)) {
            console.error('summary not found', summaryPath);
            process.exit(1);
        }

        const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        const c = s.contracts || {};

        const map = {
            BabyJubJub: c.libraries?.babyJubJub,
            RegistrationCircuitGroth16Verifier: c.verifiers?.registration,
            MintCircuitGroth16Verifier: c.verifiers?.mint,
            TransferCircuitGroth16Verifier: c.verifiers?.transfer,
            BurnCircuitGroth16Verifier: c.verifiers?.burn,
            WithdrawCircuitGroth16Verifier: c.verifiers?.withdraw,
            Registrar: c.registrar,
            EncryptedERC: c.aranduToken,
            AranduCertificate: c.certificates
        };

        const outDir = path.join(__dirname, '..', 'deployments', 'fuji');
        fs.mkdirSync(outDir, { recursive: true });

        for (const [name, addr] of Object.entries(map)) {
            if (!addr) {
                console.log('missing addr for', name);
                continue;
            }
            try {
                const art = await hh.artifacts.readArtifact(name);
                const out = { contractName: name, address: addr, abi: art.abi };
                fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(out, null, 2), 'utf8');
                console.log('wrote', name);
            } catch (e) {
                console.log('err writing', name, e.message);
            }
        }

        const contractsForUpdate = {
            registrar: map['Registrar'],
            anduToken: map['EncryptedERC'],
            certificates: map['AranduCertificate'],
            verifiers: {
                registration: map['RegistrationCircuitGroth16Verifier'],
                mint: map['MintCircuitGroth16Verifier'],
                transfer: map['TransferCircuitGroth16Verifier'],
                burn: map['BurnCircuitGroth16Verifier'],
                withdraw: map['WithdrawCircuitGroth16Verifier']
            }
        };

        u.syncDeploymentsToFrontend('fuji');
        u.updateFrontendEnv(contractsForUpdate, 'FUJI', 43113);
        u.updateFrontendConfig(contractsForUpdate, 'FUJI');

        console.log('migration to FUJI complete');
    } catch (e) {
        console.error('migration failed', e.message);
        process.exit(1);
    }
})();
