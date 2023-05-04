import { AutotaskEvent, SentinelConditionResponse } from 'defender-autotask-utils';
const { DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
import { ethers } from 'ethers';

const ScopedSecretsProvider = function (event: any) {
  const STACK_DELIM = '_';
  const namespace = event.autotaskName as any;
  const key = function* (name: string) {
    const arr = namespace.split(STACK_DELIM).concat(name);
    do yield arr.join(STACK_DELIM);
    while (arr.splice(-2, 2, name).length > 1);
  };
  const find = (name: any, target: any) => {
    for (var i of key(name)) if (i in target) return target[i];
  };
  return new Proxy(event.secrets, { get: (target, name) => find(name, target) });
};

export async function handler(event: AutotaskEvent) {
  const match = event?.request?.body as any;
  const provider = new DefenderRelayProvider(event);
  const scopedSecrets = ScopedSecretsProvider(event);

  const _minimum = scopedSecrets['LOW_GAS_THRESHOLD'];
  if (!_minimum) throw new Error('Gas minimum not set');

  let retval: SentinelConditionResponse = { matches: [] };
  for (const evt of match.events) {
    console.log('scanning tx of hash: ', evt.hash);
    for (const address of evt.matchedAddresses) {
      console.log('checking balance of ', address);
      const balance = await provider.getBalance(address);
      const minimum = ethers.utils.parseEther(_minimum);
      console.log('balance:', ethers.utils.formatEther(balance));
      console.log('minimum:', ethers.utils.formatEther(minimum));
      console.log('minimum.gt(balance)', minimum.gt(balance));
      if (minimum.gt(balance)) {
        retval.matches.push({
          hash: evt.hash,
          metadata: {
            address: address,
            balance: balance,
            minimum: ethers.utils.formatEther(minimum),
          },
        });
      }
    }
  }
  return retval;
}
