// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title YiBiGame - NumberPath Puzzle Game
 * @notice A blockchain-based puzzle game where players connect numbers on an N×N grid
 */
contract YiBiGame {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice A coordinate point on the grid
    struct Point {
        uint8 x;
        uint8 y;
    }

    /// @notice A hint that specifies a coordinate where a specific number must be placed
    struct Hint {
        Point coord;
        uint16 value; // The number that must be at this coordinate (1-indexed)
    }

    /// @notice A game level containing puzzle configuration
    struct Level {
        uint256 id;
        string name;
        uint8 size; // N for N×N grid
        address creator;
        uint256 createdAt;
        uint256 completionCount;
        Hint[] hints;
    }

    /// @notice Return type for level queries
    struct LevelInfo {
        uint256 index;
        string name;
        uint8 size;
        uint256 hintsCount;
        uint256 completionCount;
        uint256 createdAt;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Array of all levels
    Level[] public levels;

    /// @notice Mapping to track if an address has completed a specific level
    mapping(uint256 => mapping(address => bool)) public hasCompleted;

    /// @notice Mapping to track level uniqueness by hash
    mapping(bytes32 => bool) public levelHashes;

    /// @notice Counter for generating unique level IDs
    uint256 public nextLevelId = 1;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event LevelCreated(
        uint256 indexed levelId,
        address indexed creator,
        string name,
        uint8 size,
        uint256 hintsCount
    );

    event LevelSolved(
        uint256 indexed levelId,
        address indexed solver,
        uint256 pathLength,
        bool isFirstCompletion
    );

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidSize(uint8 size);
    error EmptyHints();
    error InvalidHintCoordinate(uint8 x, uint8 y, uint8 size);
    error InvalidHintValue(uint16 value);
    error HintValueNotInOrder(uint16 currentValue, uint16 previousValue);
    error LevelAlreadyExists(bytes32 levelHash);
    error LevelNotFound(uint256 levelId);
    error SolutionInvalid(string reason);

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/



    /*//////////////////////////////////////////////////////////////
                            CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a new game level
     * @param name The name of the level
     * @param size The grid size (N for N×N), must be between 2 and 16
     * @param hints Array of hints specifying required number positions
     * @return levelId The ID of the newly created level
     */
    function createLevel(
        string memory name,
        uint8 size,
        Hint[] memory hints
    ) public returns (uint256 levelId) {
        // Validate size
        if (size < 2 || size > 16) {
            revert InvalidSize(size);
        }

        // Validate hints array is not empty
        if (hints.length == 0) {
            revert EmptyHints();
        }

        // Validate each hint and check ordering
        uint16 previousValue = 0;
        for (uint256 i = 0; i < hints.length; i++) {
            Hint memory hint = hints[i];

            // Validate value is at least 1
            if (hint.value == 0) {
                revert InvalidHintValue(hint.value);
            }

            // Check if values are in ascending order
            if (hint.value <= previousValue) {
                revert HintValueNotInOrder(hint.value, previousValue);
            }
            previousValue = hint.value;

            // Validate coordinate is within bounds
            if (hint.coord.x >= size || hint.coord.y >= size) {
                revert InvalidHintCoordinate(hint.coord.x, hint.coord.y, size);
            }
        }

        // Check level uniqueness
        bytes memory encoded = abi.encodePacked(size, uint8(hints.length));
        for (uint256 i = 0; i < hints.length; i++) {
            encoded = abi.encodePacked(
                encoded,
                hints[i].value,
                hints[i].coord.x,
                hints[i].coord.y
            );
        }
        bytes32 levelHash = keccak256(encoded);
        if (levelHashes[levelHash]) {
            revert LevelAlreadyExists(levelHash);
        }

        // Create new level
        levelId = nextLevelId++;

        Level storage newLevel = levels.push();
        newLevel.id = levelId;
        newLevel.name = name;
        newLevel.size = size;
        newLevel.creator = msg.sender;
        newLevel.createdAt = block.timestamp;
        newLevel.completionCount = 0;

        // Copy hints to storage
        for (uint256 i = 0; i < hints.length; i++) {
            newLevel.hints.push(hints[i]);
        }

        // Mark level hash as used
        levelHashes[levelHash] = true;

        emit LevelCreated(levelId, msg.sender, name, size, hints.length);
    }

    /**
     * @notice Submits a solution path for a level
     * @param levelId The ID of the level to solve
     * @param path Array of points representing the path (index 0 = number 1, index 1 = number 2, etc.)
     */
    function submitSolution(
        uint256 levelId,
        Point[] memory path
    ) public {
        // Check if level exists
        if (levelId == 0 || levelId > levels.length) {
            revert LevelNotFound(levelId);
        }

        Level storage level = levels[levelId - 1];

        // Check if player has already completed this level
        bool alreadyCompleted = hasCompleted[levelId][msg.sender];

        // Verify the solution - revert if invalid
        (bool valid, string memory reason) = _verifySolution(level, path);
        if (!valid) {
            revert SolutionInvalid(reason);
        }

        // Update state only if first completion
        if (!alreadyCompleted) {
            level.completionCount++;
            hasCompleted[levelId][msg.sender] = true;
            emit LevelSolved(levelId, msg.sender, path.length, true);
        } else {
            // Practice mode: just verify without updating state
            emit LevelSolved(levelId, msg.sender, path.length, false);
        }
    }

    /**
     * @notice Internal function to verify a solution path
     * @param level The level to verify against
     * @param path The solution path to verify
     * @return valid True if the solution is valid
     * @return reason Error reason if invalid
     */
    function _verifySolution(
        Level memory level,
        Point[] memory path
    ) internal pure returns (bool valid, string memory reason) {
        // Path cannot be empty
        if (path.length == 0) {
            return (false, "Path is empty");
        }

        uint8 size = level.size;

        // Bitmap to track visited coordinates (256 bits enough for 16x16 grid)
        bytes32 visited = bytes32(0);

        // Verify each point in the path
        for (uint256 i = 0; i < path.length; i++) {
            Point memory point = path[i];

            // 1. Boundary check
            if (point.x >= size || point.y >= size) {
                return (false, "Point out of bounds");
            }

            // 2. Duplicate check using bitmap
            uint256 bitIndex = uint256(point.y) * uint256(size) + uint256(point.x);
            bytes32 mask = bytes32(uint256(1) << bitIndex);

            if (visited & mask != bytes32(0)) {
                return (false, "Duplicate point in path");
            }
            visited |= mask;

            // 3. Continuity check (not applicable for first point)
            if (i > 0) {
                Point memory prevPoint = path[i - 1];
                uint8 dx = prevPoint.x > point.x
                    ? prevPoint.x - point.x
                    : point.x - prevPoint.x;
                uint8 dy = prevPoint.y > point.y
                    ? prevPoint.y - point.y
                    : point.y - prevPoint.y;

                // Manhattan distance must be exactly 1 (adjacent horizontally or vertically)
                if (dx + dy != 1) {
                    return (false, "Path is not continuous");
                }
            }
        }

        // 4. Hint matching check
        for (uint256 i = 0; i < level.hints.length; i++) {
            Hint memory hint = level.hints[i];

            // Check if path is long enough
            if (path.length < hint.value) {
                return (false, "Path is too short for hint");
            }

            // path is 0-indexed, hint.value is 1-indexed
            Point memory actualPoint = path[hint.value - 1];

            if (
                actualPoint.x != hint.coord.x || actualPoint.y != hint.coord.y
            ) {
                return (false, "Hint does not match");
            }
        }

        return (true, "");
    }

    /**
     * @notice Queries levels with pagination
     * @param offset The starting index (0-based)
     * @param limit Maximum number of levels to return
     * @return levelInfos Array of level information
     * @return total Total number of levels
     */
    function getLevels(
        uint256 offset,
        uint256 limit
    ) public view returns (LevelInfo[] memory levelInfos, uint256 total) {
        total = levels.length;

        // Handle offset overflow
        if (offset >= total) {
            return (new LevelInfo[](0), total);
        }

        // Calculate actual number of levels to return
        uint256 count = limit;
        uint256 remaining = total - offset;

        if (count > remaining) {
            count = remaining;
        }

        // Limit to prevent gas issues
        if (count > 100) {
            count = 100;
        }

        levelInfos = new LevelInfo[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 levelIndex = offset + i;
            Level storage level = levels[levelIndex];

            levelInfos[i] = LevelInfo({
                index: levelIndex,
                name: level.name,
                size: level.size,
                hintsCount: level.hints.length,
                completionCount: level.completionCount,
                createdAt: level.createdAt
            });
        }
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Gets the total number of levels
     * @return The total count of levels
     */
    function getLevelsCount() public view returns (uint256) {
        return levels.length;
    }

    /**
     * @notice Checks if a level configuration already exists
     * @param size The grid size
     * @param hints Array of hints
     * @return exists True if the level configuration already exists
     * @return levelHash The hash of the level configuration
     */
    function levelExists(
        uint8 size,
        Hint[] memory hints
    ) public view returns (bool exists, bytes32 levelHash) {
        bytes memory encoded = abi.encodePacked(size, uint8(hints.length));
        for (uint256 i = 0; i < hints.length; i++) {
            encoded = abi.encodePacked(
                encoded,
                hints[i].value,
                hints[i].coord.x,
                hints[i].coord.y
            );
        }
        levelHash = keccak256(encoded);
        exists = levelHashes[levelHash];
    }

    /**
     * @notice Gets detailed information about a specific level
     * @param levelId The ID of the level
     * @return level The level data
     */
    function getLevel(uint256 levelId) public view returns (Level memory level) {
        if (levelId == 0 || levelId > levels.length) {
            revert LevelNotFound(levelId);
        }
        return levels[levelId - 1];
    }

    /**
     * @notice Checks if an address has completed a specific level
     * @param levelId The ID of the level
     * @param player The address to check
     * @return True if the player has completed the level
     */
    function hasPlayerCompleted(
        uint256 levelId,
        address player
    ) public view returns (bool) {
        return hasCompleted[levelId][player];
    }

    /**
     * @notice Verifies a solution without modifying state (for frontend preview)
     * @param levelId The ID of the level
     * @param path The solution path to verify
     * @return valid True if the solution is valid
     * @return reason Error reason if invalid
     */
    function verifySolution(
        uint256 levelId,
        Point[] memory path
    ) public view returns (bool valid, string memory reason) {
        if (levelId == 0 || levelId > levels.length) {
            return (false, "Level not found");
        }

        // Direct call to internal verification function
        return _verifySolution(levels[levelId - 1], path);
    }
}
