# Arandu Contract - Monorepo de Blockchain

Arandu is a privacy-oriented suite of smart contracts designed for education-focused blockchain applications. The codebase implements primitives for issuing verifiable academic credentials and managing an encrypted token economy that preserves user privacy while enabling provable actions.

## 📁 Estruct Project

```bash
arandu-contract/
├── .env # Environment variables (private keys, API keys)
├── .gitignore # Files ignored by Git
├── package.json # Monorepo root configuration
└── packages/
├── hardhat/ # Blockchain development package
│ ├── contracts/ # Smart contracts
│ ├── scripts/ # Automation scripts
│ ├── test/ # Contract tests
│ ├── deploy/ # Deployment scripts (hardhat-deploy)
│ ├── deployments/ # Deployment information
│ ├── wallets/ # Test wallets (unversioned)
│ ├── utils/ # Utilities and helper functions
│ └── package.json # Hardhat package dependencies
└── react-app/ # Frontend application
├── src/ # React source code
├── contracts/ # Auto-generated ABIs
# Arandu Smart Contracts — Project Overview
```

## Purpose and Intent

The core idea of Arandu is to combine public, verifiable credentials (NFTs) with a private, encrypted token layer (ANDU) so that learners can hold and use incentives privately while still proving certain claims publicly when needed.

- Public credentials are minted as NFTs to assert achievements and provide verifiable proof of learning.
- Private token balances are stored and updated in encrypted form, allowing transfers, mints, and burns to be validated on-chain via proofs without revealing amounts.
- A registration and verifier subsystem connects user identities to decryption keys and enforces that only valid, proof-backed operations modify the private state.

## Main Contracts (conceptual)

- AranduCertificate.sol
- Public NFT representing academic achievements. Minting is restricted to authorized issuers and includes metadata that points to evidence (URIs, IPFS).
- EncryptedERC.sol & EncryptedUserBalances.sol
- Implements encrypted-balance accounting: the smart contracts store ciphertexts or commitments and accept state updates only when accompanied by valid cryptographic proofs.

- Registrar.sol
- Records user registration and links on-chain addresses to key commitments or identifiers used by the privacy SDK. It provides `isUserRegistered` and registration hooks used by clients.

- Verifier Contracts
- Verifier contracts (for mint, transfer, burn, registration, withdraw) validate zero-knowledge proofs submitted with private-token operations. They are the on-chain gatekeepers for privacy-preserving updates.

- Utilities & Test Tokens
- Supporting contracts such as SimpleERC20, FeeERC20, and TokenTracker exist to help with testing, fee handling, and bridging scenarios. Crypto helper libraries (e.g., BabyJubJub) provide primitives used by proofs.

## Typical Flow and Interactions

1. Registration: A user registers via the `Registrar`. Registration ties an on-chain address to a decryption key commitment or identifier handled by the off-chain SDK.

2. Private Operations: The client or SDK constructs a proof and new encrypted state (ciphertexts). The transaction sends the proof and ciphertexts to the encrypted-token contract and a verifier. On success, the on-chain ciphertexts are updated.

3. Public Certificates: Authorized issuers mint `AranduCertificate` NFTs to recipients; these tokens are public and can be verified externally.

4. Auditing/Governance: Role-bound contracts allow auditors or governance agents to perform restricted checks or revocations under policy, minimizing unnecessary data exposure.

## Security and Privacy Notes

- On-chain state for private tokens intentionally avoids plain balances; instead it holds cryptographic artifacts (ciphertexts/commitments).
- Decryption keys and proof generation are handled by an off-chain SDK or secure client; those keys should never be committed to source control.
- The actual privacy guarantees depend on correct proof generation, secure key management, and well-audited verifier parameters.

## Integrations and Assumptions

- Off-chain SDK: The system expects an SDK to manage keys, decrypt balances for display, and produce zk-proofs for private operations.
- Frontend Modes: The frontend supports a walletless demo mode for testing (using curated test wallets and demo keys) and a production mode where users manage their own keys.

## Audience

- Engineers and architects building privacy-preserving token systems for credentialing or incentives.
- Security auditors reviewing public/private separation, verifier logic, and registration flows.
- Product teams evaluating trade-offs between privacy, auditability, and ease-of-use for EdTech scenarios.

## Limitations

- This repository contains demo fallbacks and test helpers; demo keys or placeholder proofs do not provide production-grade privacy.
- Real deployments require a secure ceremony for SNARK parameters (when used), hardened key management, and thorough security audits.
