// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesComp.sol";

contract GovernorCompatibilityBravoMock is Governor, GovernorCompatibilityBravo, GovernorVotesComp {
    constructor(ERC20VotesComp _token) Governor("MockDAO") GovernorVotesComp(_token) {}

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, GovernorCompatibilityBravo) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function votingDelay() public pure virtual override returns (uint256) {
        return 0;
    }

    function votingPeriod() public pure virtual override returns (uint256) {
        return 0;
    }

    function quorum(uint256 blockNumber) public pure virtual override returns (uint256) {
        if (blockNumber == 0) {}
        return 0;
    }

    function proposalThreshold() public pure virtual override returns (uint256) {
        return 0;
    }

    function proposalEta(uint256 proposalId) public view virtual override returns (uint256) {
        if (proposalId == 0) {}
        return 0;
    }

    function timelock() public view virtual override returns (address) {
        return address(0);
    }

    function queue(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override returns (uint256) {
        if (targets.length == 0) {}
        if (values.length == 0) {}
        if (calldatas.length == 0) {}
        if (descriptionHash == 0) {}
        return 0;
    }
}
