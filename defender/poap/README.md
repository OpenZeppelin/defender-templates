## POAP Mint with Autotask Defender

This template will allow you to create simple POAP minting application quickly. 

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

Have fun hacking! 
