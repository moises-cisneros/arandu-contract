// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleERC20
 * @dev A simple ERC20 token with faucet functionality for testing
 */
contract SimpleERC20 is ERC20, Ownable {
    uint256 public immutable FAUCET_AMOUNT;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) public lastFaucetClaim;

    event FaucetClaim(address indexed user, uint256 amount);

    /**
     * @dev Constructor that sets up the token
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param initialSupply_ Initial supply to mint to deployer
     * @param faucetAmount_ Amount of tokens to give per faucet claim
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 faucetAmount_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        FAUCET_AMOUNT = faucetAmount_;

        // Mint initial supply to deployer
        if (initialSupply_ > 0) {
            _mint(msg.sender, initialSupply_);
        }
    }

    /**
     * @dev Allows users to claim tokens from the faucet
     */
    function claimFromFaucet() external {
        require(
            canClaimFromFaucet(msg.sender),
            "Faucet: Cooldown period not elapsed"
        );

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Check if a user can claim from the faucet
     * @param user Address to check
     * @return bool True if user can claim
     */
    function canClaimFromFaucet(address user) public view returns (bool) {
        return block.timestamp >= lastFaucetClaim[user] + FAUCET_COOLDOWN;
    }

    /**
     * @dev Get the timestamp when a user can next claim from the faucet
     * @param user Address to check
     * @return uint256 Timestamp of next available claim
     */
    function getNextFaucetClaimTime(
        address user
    ) external view returns (uint256) {
        if (lastFaucetClaim[user] == 0) {
            return block.timestamp; // Can claim immediately if never claimed
        }
        return lastFaucetClaim[user] + FAUCET_COOLDOWN;
    }

    /**
     * @dev Get time remaining until next faucet claim
     * @param user Address to check
     * @return uint256 Seconds remaining until next claim (0 if can claim now)
     */
    function getTimeUntilNextFaucetClaim(
        address user
    ) external view returns (uint256) {
        if (canClaimFromFaucet(user)) {
            return 0;
        }

        uint256 nextClaimTime = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        return nextClaimTime - block.timestamp;
    }

    /**
     * @dev Owner can mint additional tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Owner can change the faucet amount (for future deployments)
     * Note: FAUCET_AMOUNT is immutable in this version
     */
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Get token information in a single call
     * @return name_ Token name
     * @return symbol_ Token symbol
     * @return decimals_ Token decimals
     * @return totalSupply_ Total token supply
     * @return faucetAmount_ Amount given per faucet claim
     */
    function getTokenInfo()
        external
        view
        returns (
            string memory name_,
            string memory symbol_,
            uint8 decimals_,
            uint256 totalSupply_,
            uint256 faucetAmount_
        )
    {
        return (name(), symbol(), decimals(), totalSupply(), FAUCET_AMOUNT);
    }
}
