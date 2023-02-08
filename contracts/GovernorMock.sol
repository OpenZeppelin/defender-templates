// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/extensions/IGovernorTimelock.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

abstract contract GovernorMock is
    IGovernor,
    IGovernorTimelock,
    GovernorSettings,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor() Governor("MockDAO") GovernorVotesQuorumFraction(0) {}

    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "";
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {}

    function _quorumReached(uint256 proposalId) internal view virtual override returns (bool) {
        if (proposalId != 0) {}
        return false;
    }

    function _voteSucceeded(uint256 proposalId) internal view virtual override returns (bool) {
        if (proposalId != 0) {}
        return false;
    }

    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        if (proposalId != 0) {}
        if (account != address(0)) {}
        return false;
    }

    function queue(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override(GovernorTimelockControl, IGovernorTimelock) returns (uint256) {
        return super.queue(targets, values, calldatas, descriptionHash);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view virtual override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function state(
        uint256 proposalId
    ) public view virtual override(IGovernor, Governor, GovernorTimelockControl) returns (ProposalState) {}

    function proposalThreshold() public view virtual override(Governor, GovernorSettings) returns (uint256) {
        return 0;
    }
}
