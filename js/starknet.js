/* Coloring Book: optional Starknet layer.
 * - Connect with Cartridge (StarkZap: social / passkey login, sponsored fees when available)
 *   or a browser extension wallet (Ready, Braavos, via get-starknet-core).
 * - Mint the open coloring page as an ERC-721 (contract ColoringBook, see contracts/).
 * - The agent button copies a starknet_invoke_contract call for the starknet-agentic MCP server.
 * Both vendor bundles are local and load only when the player presses Connect.
 * Offline play makes no network requests. Sepolia only. */
(function () {
  'use strict';
  const C = Object.assign({}, window.CB_STARKNET_CONFIG || {}, window.CB_STARKNET_CONFIG_OVERRIDE || {});
  const GAME = window.CB_GAME;
  if (!C.enabled || !GAME) return;
  const SEL = window.CB_SELECTORS || {};
  const configured = /^0x[0-9a-fA-F]{1,64}$/.test(C.contractAddress || '');
  const cartridgeOn = !!(C.cartridge && C.cartridge.enabled !== false);
  const feeMode = (C.cartridge && C.cartridge.feeMode) || { type: 'paymaster' };
  let wallet = null, kind = null, address = null, chainOk = true, busy = false, feeFallbackUsed = false;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = (a) => a ? a.slice(0, 6) + '…' + a.slice(-4) : '';

  const loaders = {};
  function load(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (loaders[src]) return loaders[src];
    loaders[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => window[globalName] ? res(window[globalName]) : rej(new Error('wallet library failed to load'));
      s.onerror = () => { delete loaders[src]; rej(new Error('wallet library failed to load (are you offline?)')); };
      document.head.appendChild(s);
    });
    return loaders[src];
  }
  const gsn = () => load('js/vendor/get-starknet-core.js', 'CB_GSN').then((m) => m.getStarknet());
  const starkzap = () => load('js/vendor/starkzap.js', 'CB_STARKZAP');

  async function rpc(method, params) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(C.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctl.signal,
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } finally { clearTimeout(t); }
  }

  function nameFelt(n) {
    const ascii = [...String(n || '')].filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 32 && c < 127 && c !== 34 && c !== 92;
    }).slice(0, 31);
    return ascii.length ? '0x' + ascii.map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('') : '0x0';
  }

  function classify(e) {
    const m = String((e && (e.message || e)) || '').toLowerCase();
    if (/reject|cancel|denied|abort|refused|closed/.test(m)) return 'You cancelled in the wallet. Nothing was sent.';
    if (/already minted/.test(m)) return 'This exact coloring is already on Starknet.';
    if (/popup/.test(m)) return 'Please allow pop-ups for this page to sign in with Cartridge.';
    if (/insufficient|not enough|funds|balance/.test(m)) return 'The wallet needs a little Sepolia test STRK for the fee.';
    if (/fetch|network|offline|failed to load|timeout|abort/.test(m)) return 'Network problem: check your connection and try again.';
    if (/paymaster|sponsor|snip-9|outside execution/.test(m)) return 'Free minting is not available right now.';
    return 'Starknet error: ' + String((e && e.message) || e).slice(0, 160);
  }

  function txLink(hash) {
    return '<a href="' + esc(C.explorerTx + hash) + '" target="_blank" rel="noopener">View on Voyager ↗</a>';
  }

  async function tokenOfArt(hash) {
    if (!configured || !SEL.token_of_art) return null;
    const res = await rpc('starknet_call', {
      request: { contract_address: C.contractAddress, entry_point_selector: SEL.token_of_art, calldata: [hash] },
      block_id: 'latest',
    });
    return BigInt(res[0]) + (BigInt(res[1] || 0) << 128n);
  }

  async function callsFor(pageId) {
    const job = await GAME.job(pageId);
    const calldata = [nameFelt(job.page.id), nameFelt(job.page.name), job.hash, '0x' + job.colors.length.toString(16)].concat(job.colors);
    return {
      job,
      calldata,
      call: { contractAddress: C.contractAddress, entrypoint: 'mint_page', calldata },
    };
  }

  async function executeCartridge(call, mode) {
    const pre = await wallet.preflight({ calls: [call], feeMode: mode });
    if (pre && pre.ok === false) throw new Error(pre.reason || 'The transaction would fail');
    return wallet.execute([call], { feeMode: mode });
  }

  async function waitReceipt(hash) {
    const start = Date.now();
    while (Date.now() - start < 180000) {
      try {
        const r = await rpc('starknet_getTransactionReceipt', [hash]);
        const exec = String(r.execution_status || '');
        const fin = String(r.finality_status || r.status || '');
        if (/REVERT/i.test(exec + fin)) throw new Error('reverted');
        GAME.setMintStatus('Pending… ' + esc(fin || exec || 'sent') + ' ' + txLink(hash), 'pending');
        if (/SUCCEEDED/i.test(exec) || /ACCEPTED/i.test(fin)) return r;
      } catch (e) {
        if (/reverted/i.test(String(e && e.message))) throw e;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('timeout');
  }

  function mountConnect(el) {
    if (!el) return;
    const who = address
      ? '<p class="small">Connected' + (kind === 'cartridge' ? ' with Cartridge' : '') + ': <b>' + esc(short(address)) + '</b>' + (chainOk ? '' : ' · wrong network') + '</p>'
      : '';
    el.innerHTML = who + '<div class="tools" id="snActions"></div><p class="small" id="snStatus"></p>';
    const actions = el.querySelector('#snActions');
    if (address) {
      const off = document.createElement('button');
      off.className = 'btn';
      off.type = 'button';
      off.textContent = 'Disconnect';
      off.onclick = async () => {
        try { if (wallet && wallet.disconnect) await wallet.disconnect(); } catch (e) { /* ignore */ }
        wallet = null; address = null; kind = null;
        mountConnect(el);
      };
      actions.append(off);
      return;
    }
    if (cartridgeOn) {
      const b = document.createElement('button');
      b.className = 'btn primary';
      b.type = 'button';
      b.textContent = 'Play with Cartridge';
      b.onclick = () => connectCartridge(el);
      actions.append(b);
    }
    const ext = document.createElement('div');
    ext.className = 'tools';
    ext.innerHTML = '<span class="small">Looking for browser wallets…</span>';
    actions.append(ext);
    gsn().then((g) => g.getAvailableWallets()).then((list) => {
      if (!ext.isConnected) return;
      ext.innerHTML = '';
      if (!list || !list.length) {
        ext.innerHTML = '<span class="small">No browser wallet found. Install ' +
          C.installLinks.map((l) => '<a href="' + l.url + '" target="_blank" rel="noopener">' + esc(l.name) + '</a>').join(' or ') +
          '.</span>';
        return;
      }
      list.forEach((w) => {
        const b = document.createElement('button');
        b.className = 'btn';
        b.type = 'button';
        b.textContent = /argent|ready/i.test(String(w.id) + w.name) ? 'Ready' : w.name;
        b.onclick = () => connectExtension(w, el);
        ext.append(b);
      });
    }).catch((e) => { ext.innerHTML = '<span class="small">' + esc(classify(e)) + '</span>'; });
  }

  function snStatus(el, text) {
    const s = el && el.querySelector && el.querySelector('#snStatus');
    if (s) s.textContent = text;
  }

  async function connectCartridge(el) {
    try {
      snStatus(el, 'Loading Cartridge…');
      const SZ = await starkzap();
      const policies = configured ? (C.cartridge.methods || ['mint_page']).map((m) => ({ target: C.contractAddress, method: m })) : [];
      const labels = { CONNECTING: 'Sign in…', CHECK_DEPLOYED: 'Checking your account…', DEPLOYING: 'Setting up your account…', READY: 'Ready' };
      wallet = await SZ.connect({
        network: C.network,
        rpcUrl: C.rpcUrl,
        policies,
        feeMode,
        deploy: C.cartridge.deploy || 'if_needed',
        ...(C.cartridge.preset ? { preset: C.cartridge.preset } : {}),
        onProgress: (s) => snStatus(el, labels[s] || s || ''),
      });
      kind = 'cartridge';
      address = wallet.address;
      chainOk = true;
      GAME.toast('Connected with Cartridge');
      mountConnect(el);
      return true;
    } catch (e) {
      snStatus(el, classify(e));
      GAME.toast(classify(e));
      return false;
    }
  }

  async function connectExtension(w, el) {
    try {
      const g = await gsn();
      const sw = await g.enable(w);
      const accts = await sw.request({ type: 'wallet_requestAccounts', params: {} });
      address = accts && accts[0];
      if (!address) throw new Error('No account');
      let chainId = null;
      try { chainId = await sw.request({ type: 'wallet_requestChainId' }); } catch (e) { /* older wallets */ }
      chainOk = !chainId || String(chainId).toLowerCase() === C.chainId.toLowerCase();
      if (!chainOk) {
        try {
          await sw.request({ type: 'wallet_switchStarknetChain', params: { chainId: C.chainId } });
          chainOk = true;
        } catch (e) { /* user said no */ }
      }
      wallet = sw;
      kind = 'extension';
      GAME.toast('Wallet connected');
      mountConnect(el);
      return true;
    } catch (e) {
      GAME.toast(classify(e));
      return false;
    }
  }

  async function mint(pageId) {
    if (!configured) {
      GAME.setMintStatus('Coming soon. No contract address is configured, so nothing was sent.', 'pending');
      return;
    }
    if (busy) return;
    const built = await callsFor(pageId);
    if (!built.job.colored) {
      GAME.toast('Color a shape first');
      GAME.setMintStatus('Color a shape first.', 'error');
      return;
    }
    if (!wallet) {
      GAME.toast('Connect a wallet first');
      GAME.setMintStatus('Connect a wallet, then mint.', 'pending');
      return;
    }
    if (!chainOk) {
      GAME.toast('Please switch your wallet to ' + C.networkName);
      return;
    }
    busy = true;
    const go = document.getElementById('mintGo');
    if (go) go.disabled = true;
    try {
      const existing = await tokenOfArt(built.job.hash).catch(() => null);
      if (existing && existing > 0n) {
        const url = C.explorerNft + C.contractAddress + '/' + existing;
        GAME.markMinted(built.job.key, { token: existing.toString(), url });
        GAME.setMintStatus('This coloring is already minted as #' + existing + '. <a href="' + esc(url) + '" target="_blank" rel="noopener">View on Voyager ↗</a>', 'ok');
        return;
      }
      GAME.setMintStatus(kind === 'cartridge' ? 'Minting with Cartridge…' : 'Check your wallet to approve the mint.', 'pending');
      let txHash;
      if (kind === 'cartridge') {
        let tx;
        try { tx = await executeCartridge(built.call, feeFallbackUsed ? C.cartridge.fallbackFeeMode : feeMode); }
        catch (e) {
          if (!feeFallbackUsed && /paymaster|sponsor|snip-9|outside execution/i.test(String(e && e.message))) {
            feeFallbackUsed = true;
            GAME.toast('Free minting is not available right now. Your wallet pays the small test fee.');
            tx = await executeCartridge(built.call, C.cartridge.fallbackFeeMode || 'user_pays');
          } else throw e;
        }
        txHash = tx.hash || tx.transaction_hash;
        GAME.setMintStatus('Pending… ' + txLink(txHash), 'pending');
        if (tx.wait) await tx.wait();
        else await waitReceipt(txHash);
      } else {
        const res = await wallet.request({
          type: 'wallet_addInvokeTransaction',
          params: { calls: [{ contract_address: built.call.contractAddress, entry_point: built.call.entrypoint, calldata: built.call.calldata }] },
        });
        txHash = res && (res.transaction_hash || res.transactionHash);
        if (!txHash) throw new Error('The wallet returned no transaction hash');
        GAME.setMintStatus('Pending… ' + txLink(txHash), 'pending');
        await waitReceipt(txHash);
      }
      const token = await tokenOfArt(built.job.hash).catch(() => null);
      const url = token ? C.explorerNft + C.contractAddress + '/' + token : C.explorerTx + txHash;
      GAME.markMinted(built.job.key, { tx: txHash, token: token ? token.toString() : null, url });
      const fuel = feeFallbackUsed && C.faucetUrl ? ' Need test STRK? <a href="' + esc(C.faucetUrl) + '" target="_blank" rel="noopener">Sepolia faucet</a>.' : '';
      GAME.setMintStatus('Minted. ' + txLink(txHash) + (token ? ' · token #' + token : '') + fuel, 'ok');
    } catch (e) {
      const msg = classify(e);
      const fuel = /test STRK/.test(msg) && C.faucetUrl ? ' <a href="' + esc(C.faucetUrl) + '" target="_blank" rel="noopener">Sepolia faucet</a>' : '';
      GAME.setMintStatus(msg + fuel, 'error');
      GAME.toast(msg);
    } finally {
      busy = false;
      if (go) go.disabled = false;
    }
  }

  async function agentPayload(pageId) {
    const built = await callsFor(pageId);
    return {
      tool: 'starknet_invoke_contract',
      arguments: {
        contractAddress: configured ? C.contractAddress : '<COLORING_BOOK_CONTRACT_ADDRESS>',
        entrypoint: 'mint_page',
        calldata: built.calldata,
      },
    };
  }

  window.CB_STARKNET = {
    enabled: true,
    configured,
    mountConnect,
    mint,
    agentPayload,
    get address() { return address; },
    get kind() { return kind; },
  };
  if (GAME.refresh) GAME.refresh();
})();
