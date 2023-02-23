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

export interface POAPMessage {
  name: string;
  wallet: string;
}
export const signPOAPMessage = async (name: string, signer: Wallet | SignerWithAddress) => {
  const message: POAPMessage = { name: name, wallet: signer.address };
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
  } as const;

  const cliOptions = yargs.options(options).parseSync();

  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
  signPOAPMessage(cliOptions.name, signer)
    .then(signature => {
      console.log('Signature is:', signature);
      return process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
