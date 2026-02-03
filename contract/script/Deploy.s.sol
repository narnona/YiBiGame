// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/YiBiGame.sol";

/**
 * @title Deploy YiBiGame Contract
 * @notice Deployment script for YiBiGame contract
 */
contract DeployScript is Script {
    YiBiGame public game;

    function run() external {
        // Get deployer private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get RPC URL from environment (foundry uses this automatically)
        // Use: source .env && forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        game = new YiBiGame();

        vm.stopBroadcast();

        // Log deployment info
        console.log("YiBiGame deployed to:", address(game));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);

        // Optionally create a sample level for testing
        // Uncomment below to create a sample level during deployment
        /*
        vm.startBroadcast(deployerPrivateKey);
        YiBiGame.Hint[] memory hints = new YiBiGame.Hint[](2);
        hints[0] = YiBiGame.Hint(YiBiGame.Point(0, 0), 1);
        hints[1] = YiBiGame.Hint(YiBiGame.Point(2, 2), 9);
        uint256 levelId = game.createLevel("Sample Level", 3, hints);
        vm.stopBroadcast();
        console.log("Sample level created with ID:", levelId);
        */
    }
}
