window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        await ethereum.request({ method: 'eth_requestAccounts' });
        window.provider = new ethers.providers.Web3Provider(window.ethereum);
        window.signer = window.provider.getSigner();
        window.contractAddress = '0x9A2C5733758C9E7E29Ae632EebA88F077DBCfde2';
        window.contractABI = await fetchContractABI();
        window.contract = new ethers.Contract(window.contractAddress, window.contractABI, window.signer);

        // 显示代币余额
        showBalance();
    } else {
        console.log('请安装 MetaMask 或其他支持 Web3 的浏览器插件');
    }
});

async function fetchContractABI() {
    const response = await fetch('abi.json');
    const abi = await response.json();
    return abi;
}

// 其余代码保持不变

async function showBalance() {
    const address = await window.signer.getAddress();
    const balance = await window.contract.balanceOf(address);
    const decimals = await window.contract.decimals();
    const balanceFormatted = balance.div(ethers.BigNumber.from(10).pow(decimals)).toString();
    document.getElementById('balance').innerHTML = `余额：${balanceFormatted}`;
}

async function transfer() {
    const to = document.getElementById('to').value;
    const amount = document.getElementById('amount').value;
    const decimals = await window.contract.decimals();
    const amountWithDecimals = ethers.utils.parseUnits(amount, decimals);

    try {
        const tx = await window.contract.transfer(to, amountWithDecimals);
        await tx.wait();
        console.log('转账成功');
        showBalance();
    } catch (error) {
        console.error('转账失败', error);
    }
}