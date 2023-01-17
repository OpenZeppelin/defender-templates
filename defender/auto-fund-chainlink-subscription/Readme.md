# Auto fund Chainlink Subscription when funds are low

[Chainlink VRF](https://docs.chain.link/vrf/v2/introduction) is one of the most popular options for achieving provable randomness in a blockchain. It can be used for raffles, gaming and other use cases.  
In order to fulfill randomness requests from your smart contracts you need to have LINK in your subscription.
We use Defender to observe when funds are low on a Chainlink subscription and use an Autotask to take ETH from a Relayer, swap it for LINK on Uniswap and fund the subscription. All done automatically.

Config files:
- **subscription-config.{env}.yml**: Configure your subscription id and thresholds [here](./subscription-config.dev.yml)

## Prerequesits
In order to setup this template you need a Chainlink subscription and some ETH on your relayer.
1. If you don't have a chainlink subscription create one following this [guide](https://docs.chain.link/vrf/v2/subscription/)
2. Get some goerli ETH from a faucet such as [this](https://goerlifaucet.com/). After deploying your relayer you will need to send it some ETH so that it can be latter swapped for LINK and fund the subscription. 


## Deployment :rocket:
This template uses external dependencies, so we use [Rollup](https://rollupjs.org/guide/en/#introduction) to bundle those dependencies inside our Javascript autotasks. We also leverage the [yaml plugin](https://github.com/rollup/plugins/tree/master/packages/yaml) to define parameters in a central location and reuse them in our serverless template and both autotasks.

Bundle the autotasks using Rollup
```sh
$ yarn build
```

Deploy serverless template
```sh
$ serverless deploy
```

You can run both steps together by running:
```sh
$ yarn defender
```