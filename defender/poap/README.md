## POAP Mint with Autotask Defender

This template will allow you to create simple POAP minting application quickly. 

The only required action from client is to sign a message, in order to validate his ownership over an address. 

When requesting a POAP mint, client can provide in request some details such as name of attendee, his contact details etc - can be pretty much anything. 

This data can be received in Defender autotasks and used to validate that attendee is legit and/or can be forwarded to CMS.


### Setup

cd in to `/autotasks/mint-poap`
Select correct `TOKEN_TYPE` and `TOKEN_ADDRESS` and `ERC1155ID` (for ERC1155 token mint);
build autotask: `yarn build`
cd back `../../`
run `sls deploy` 

Now you can log in to your defender account and copy webhook URL that can be used to mint tokens. Make sure relayer has funds and has mint permissions on the contract you are using! 

To ease signature generation there is helper script available:

from root of repo `yarn ts-node scripts/signPOAPMessage.ts --name <AttendeeName>`

We encorauge you to experiment with this template, having address and attendee name or another details in autotasks you can forward them to your hubspot/backend and/or implement verification logic! 

Example of request body:

```
{
  "address": "0xe3eFcCF966921Ad291fdC31Fa57F9044F105bc98",
  "signature": "0xd1ea49a0576519030eb92182b9aa7a0e27b97816f1427a1cee00b11de3156c58095ae2ee7fab13cea7bd3db6aaacfcef596e995d49b0100026bc927f84b0c1311c",
  "message": { "name": "Tim", "wallet": "0xe3eFcCF966921Ad291fdC31Fa57F9044F105bc98" } 
}
```

Have fun hacking! 
