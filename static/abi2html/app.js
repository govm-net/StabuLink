document.getElementById('abiForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const abiTextArea = document.getElementById('abiTextArea');
    const abi = abiTextArea.value.trim();

    if (abi) {
        const parsedAbi = parseABI(abi);
        displayOutput(parsedAbi);
    }
});

function parseABI(abi) {
    try {
        const parsed = JSON.parse(abi);
        return parsed;
    } catch (error) {
        console.error('无法解析 ABI', error);
        return null;
    }
}

function displayOutput(parsedAbi) {
    const outputDiv = document.getElementById('outputDiv');
    outputDiv.innerHTML = '';

    if (parsedAbi && Array.isArray(parsedAbi)) {
        parsedAbi.forEach((item) => {
            if (item.type === 'function') {
                const functionName = item.name || '<匿名函数>';
                const functionSignature = `${functionName}(${item.inputs.map(input => input.type).join(', ')})`;
                const functionDiv = document.createElement('div');
                functionDiv.textContent = functionSignature;
                outputDiv.appendChild(functionDiv);
            }
        });
    } else {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = '无效的 ABI';
        errorDiv.className = 'text-danger';
        outputDiv.appendChild(errorDiv);
    }
}