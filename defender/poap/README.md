## POAP Minting with Autotask Defender

This code is a template for creating an ERC-1155 POAP (Proof of Attendance Protocol) minting application. The client must sign a message to prove their ownership of an address. The client can provide additional information such as their name, contact details, etc. in the request for the POAP mint. This data can then be used to verify that the attendee is legitimate and/or forwarded to a CMS (content management system). After the request is validated, it can be minted by the Defender Relayer.

### Setup

Modify constants.js:
Select correct `TOKEN_TYPE` and `TOKEN_ADDRESS` and `ERC1155ID` (for ERC1155 token mint);
build: `yarn build`
deploy: `sls deploy` 

Now you can log in to your defender account and copy webhook URL that can be used to mint tokens. Make sure the Relayer has funds and has mint permissions on the contract you are using! 

To ease signature generation there is helper script available:

from root of repo `yarn ts-node scripts/signPOAPMessage.ts --name <AttendeeName>`

We encourage you to experiment with this template, having address and attendee name or another details in Autotasks you can forward them to your hubspot/backend and/or implement verification logic! 

Example of request body:

```
{
  "address": "0xe3eFcCF966921Ad291fdC31Fa57F9044F105bc98",
  "signature": "0xd1ea49a0576519030eb92182b9aa7a0e27b97816f1427a1cee00b11de3156c58095ae2ee7fab13cea7bd3db6aaacfcef596e995d49b0100026bc927f84b0c1311c",
  "message": { "name": "Tim", "wallet": "0xe3eFcCF966921Ad291fdC31Fa57F9044F105bc98" } 
}
```

Have fun hacking! 
