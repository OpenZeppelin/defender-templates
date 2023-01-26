# ETHDenver - OpenZeppelin Defender Integration

This repository contains templates for all tracks of the 2023 BUIDLathon. They are meant to be a place to get inspiration and kickstart your project. 

-   DeFi
-   NFTs, Gaming & the Metaverse
-   Infrastructure & Scalability
-   Impact + Public Goods
-   DAOs + Community

The templates are structured by use case, which matches to one or more tracks.

## Templates
### [Underlying asset monitor](defender/underlying-upgradable-token/Readme.md)

Most DeFi protocols face risks when integrating with upgradable tokens that are outside of the protocol's reach.  
This section shows how to monitor upgradable tokens and emit an alert :rotating_light: if they get updated.

### [Multisig Monitor](defender/multisig-monitor/Readme.md)
Most protocols have some dependency on a multisig that has special powers granted by the community. It is good practice to monitor events on that multisig.  
This template shows how to monitor for administrative events in the multisig, such as changes in the owners and threshold.

### [Auto fund chainlink subscription when funds are low](defender/auto-fund-chainlink-subscription/Readme.md)
[Chainlink VRF](https://docs.chain.link/vrf/v2/introduction) is one of the most popular options for achieving provable randomness in a blockchain. It can be used for raffles, gaming and other use cases. Wouldn't it be great if you can monitor when funds are running low and automatically fund the subscription?  

### [Gasless POAP minting](defender/poap/README.md)
Lightweight and effective Proof of Attendance Protocol implementation with Defender. The POAP can be ERC721/1555/20 depending on configuration.

In This POAP user (client) first needs to sign a message through his wallet such as metamask, that contains his address and some other typed message fields that developer can specify - name, email etc. 
Then client can POST to autotask webhook with his message and signature in request body. 

In autotask script, developer can verify that data and perhaps send it to CMS, and mint token with use of Relayer.  

### [Monitor ERC721 transfers](defender/monitor-erc721-transfers/README.md)
This simple template adds ability to monitor for ERC721 token transfers and send notifications.
BY Default we send notifications in slack, however you are free to use your custom webhook as well 

---
## Additional Resources

-   [Defender Docs](https://docs.openzeppelin.com/defender/)
-   [Defender Serverless Docs](https://docs.openzeppelin.com/defender/serverless-plugin)
-   [Defender Serverless Repo](https://github.com/OpenZeppelin/defender-serverless)
-   [Defender Playlist](https://www.youtube.com/playlist?list=PLdJRkA9gCKOMdqVKrkYKT6ulDwDVG6_Ya)
