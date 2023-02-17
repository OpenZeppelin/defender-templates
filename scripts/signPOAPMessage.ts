import { ethers } from 'hardhat';
import { Wallet } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import * as yargs from 'yargs';
const domain = { name: 'OpenZeppelin POAP Autotask', version: '1', chainId: '5' };
const types = {
  attendee: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
};

export interface POAPMEssage {
  name: string;
  wallet: string;
}
export const signPOAPMessage = async (name: string, signer: Wallet | SignerWithAddress) => {
  const message: POAPMEssage = { name: name, wallet: signer.address };
  return signer._signTypedData(domain, types, message);
};

if (require.main === module) {
  const options = {
    name: {
      type: 'string',
      required: true,
      description: 'name of attendee',
      alias: 'n',
    },
    chainId: {
      type: 'string',
      required: true,
      description: 'chain id (1 - for mainnet, 5 - for goerli, etc)',
      alias: 'c',
    },
  } as const;

  const cliOptions = yargs.options(options).parseSync();

  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  domain.chainId = cliOptions.chainId;
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
  signPOAPMessage(cliOptions.name, signer)
    .then(signature => {
      console.log(`Name is: ${cliOptions.name}`);
      console.log(`Address is: ${signer.address}`);
      console.log(`Chain ID is: ${cliOptions.chainId}`);
      console.log(`Signature is: ${signature}\n`);

      const jsonBody = {
        address: signer.address,
        signature: signature,
        message: { name: cliOptions.name, wallet: signer.address },
      };
      console.log(`JSON: ${JSON.stringify(jsonBody, null, 2)}\n`);

      console.log('Example curl command:');
      console.log(`
curl -X POST https://api.defender.openzeppelin.com/autotasks/xxxx/runs/webhook/xxxx \\
-H 'Content-Type: application/json' \\
-d '${JSON.stringify(jsonBody)}'\n`);
      return process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
