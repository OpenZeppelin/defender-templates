# Monitor upgradable tokens :rotating_light:

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for upgrades and trigger a Slack alert.

Files:
- serverless.yml: Make sure to fill the proxy address to monitor under *custom->proxy-address*

**Deploy Defender resources**

```sh
$ serverless deploy
```