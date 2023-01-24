
export const TokenTypeEnum = { ERC20: 0, ERC721: 1, ERC1155: 2 };
export const TOKEN_TYPE = TokenTypeEnum.ERC721;
export const ERC1155ID = '1';
export const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"
export const domain = { name: 'OpenZeppelin POAP Autotask', version: '1', chainId: '5' };
export const types = {
  attendee: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
};