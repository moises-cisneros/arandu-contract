// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AranduCertificado
 * @dev Contrato para emitir certificados de logros como NFTs (ERC721).
 * La propiedad del contrato está restringida, permitiendo que solo la plataforma ARANDU
 * pueda emitir nuevos certificados a los estudiantes.
 */
contract AranduCertificado is ERC721, Ownable {
    // Contador para el ID del próximo token a ser emitido.
    uint256 private _nextTokenId;

    // URI base para construir los metadatos de cada NFT.
    string private _baseTokenURI;

    /**
     * @dev El constructor inicializa el NFT con un nombre y un símbolo.
     * El dueño inicial será la dirección que despliegue el contrato.
     */
    constructor(
        address initialOwner
    ) ERC721("Certificado Arandu", "ARACERT") Ownable(initialOwner) {}

    /**
     * @dev Permite al dueño del contrato establecer la URI base para los metadatos.
     * Ejemplo: "https://api.arandu.io/nfts/"
     */
    function _setBaseURI(string memory baseURI) internal {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Anula la función base para usar nuestra URI personalizada.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Emite un nuevo certificado (NFT) a la dirección de un estudiante.
     * Solo puede ser llamado por el dueño del contrato (la plataforma ARANDU).
     * @param to La dirección del estudiante que recibirá el certificado.
     */
    function issueCertificate(address to) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    /**
     * @dev Devuelve la URI de los metadatos para un tokenId específico.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        // Concatena la URI base con el ID del token para crear la URL final de los metadatos.
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, Strings.toString(tokenId)))
                : "";
    }
}
