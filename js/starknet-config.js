/*
 * Coloring Book: Starknet settings (optional layer).
 * After deploying the contract (see contracts/DEPLOYMENT.md), paste its address into `contractAddress`.
 * While `contractAddress` is empty, the Mint button says "Coming soon" and nothing is sent.
 *
 * Cartridge (via StarkZap): social / passkey login, session policies limited to this game's
 * `mint_page` entrypoint, and feeMode { type: "paymaster" } so mints are free where sponsorship
 * is configured. Extension wallets (Ready, Braavos) are available as an alternative.
 * Sepolia only. No mainnet, no real funds.
 */
window.CB_STARKNET_CONFIG = {
  enabled: true,
  network: 'sepolia',
  networkName: 'Sepolia testnet',
  chainId: '0x534e5f5345504f4c4941',          // SN_SEPOLIA
  rpcUrl: 'https://starknet-sepolia.drpc.org',
  contractAddress: '',                        // paste the deployed ColoringBook address, or leave empty
  explorerTx: 'https://sepolia.voyager.online/tx/',
  explorerContract: 'https://sepolia.voyager.online/contract/',
  explorerNft: 'https://sepolia.voyager.online/nft/',
  faucetUrl: 'https://starknet-faucet.vercel.app/',
  cartridge: {
    enabled: true,
    feeMode: { type: 'paymaster' },
    fallbackFeeMode: 'user_pays',
    deploy: 'if_needed',
    methods: ['mint_page'],
    // preset: 'coloring-book',
  },
  installLinks: [
    { name: 'Ready', url: 'https://www.ready.co/' },
    { name: 'Braavos', url: 'https://braavos.app/' }
  ]
};
