import re

# Read the JS file
with open('/tmp/bscscan-watcher.js', 'r') as f:
    content = f.read()

# Fix the start() function to go back 80000 blocks on startup
old_start = '''    async start() {
        if (this.running)
            return;
        if (!this.depositAddress) {
            this.logger.warn('BLOCKCHAIN_BSC_DEPOSIT_ADDRESS not configured, watcher disabled');
            return;
        }
        this.running = true;
        this.logger.log('Starting BSC watcher via Ankr RPC...');
        try {
            this.lastProcessedBlock = await this.getLatestBlock();
            this.logger.log(`Starting from block ${this.lastProcessedBlock}`);
        }
        catch (err) {
            this.logger.error(`Failed to get latest block: ${err.message}`);
            this.lastProcessedBlock = 0;
        }'''

new_start = '''    async start() {
        if (this.running)
            return;
        if (!this.depositAddress) {
            this.logger.warn('BLOCKCHAIN_BSC_DEPOSIT_ADDRESS not configured, watcher disabled');
            return;
        }
        this.running = true;
        this.logger.log('Starting BSC watcher via Ankr RPC...');
        try {
            const latestBlock = await this.getLatestBlock();
            const blocksBack = 80000;
            this.lastProcessedBlock = Math.max(0, latestBlock - blocksBack);
            this.logger.log(`Starting from block ${this.lastProcessedBlock} (going back ${blocksBack} blocks)`);
        }
        catch (err) {
            this.logger.error(`Failed to get latest block: ${err.message}`);
            this.lastProcessedBlock = 0;
        }'''

content = content.replace(old_start, new_start)

# Also include the catch-up logic from before
old_poll = '''    async poll() {
        if (!this.depositAddress)
            return;
        try {
            const currentBlock = await this.getLatestBlock();
            this.logger.debug(`Poll: currentBlock=${currentBlock}, lastProcessed=${this.lastProcessedBlock}`);
            if (currentBlock <= this.lastProcessedBlock) {
                this.logger.debug('No new blocks, skipping');
                return;
            }
            const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : Math.max(0, currentBlock - 1);
            const toBlock = fromBlock;'''

new_poll = '''    async poll() {
        if (!this.depositAddress)
            return;
        try {
            const currentBlock = await this.getLatestBlock();
            this.logger.debug(`Poll: currentBlock=${currentBlock}, lastProcessed=${this.lastProcessedBlock}`);
            const blocksBehind = currentBlock - this.lastProcessedBlock;
            const maxBlocks = 100;
            const blocksToScan = Math.min(Math.max(blocksBehind, 1), maxBlocks);
            const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : Math.max(0, currentBlock - 1);
            const toBlock = fromBlock + blocksToScan - 1;'''

content = content.replace(old_poll, new_poll)

# Fix 2: Add debug logging for source addresses and RPC call
old_no_deposits = '''            if (deposits.length === 0) {
                this.lastProcessedBlock = currentBlock;
                return;
            }
            const sourceAddresses = deposits.map((d) => d.source_address?.toLowerCase()).filter(Boolean);
            const toAddress = this.depositAddress.toLowerCase();
            this.logger.debug(`Checking deposits with source addresses: [${sourceAddresses.join(', ')}]`);
            this.logger.debug(`Deposit address (to): ${toAddress}`);
            this.logger.debug(`Scanning blocks ${fromBlock}-${toBlock} (${blocksToScan} blocks)`);
            const res = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getLogs',
                    params: [{
                            address: USDT_BSC_CONTRACT,
                            fromBlock: '0x' + fromBlock.toString(16),
                            toBlock: '0x' + toBlock.toString(16),
                            topics: [
                                USDT_TRANSFER_TOPIC,
                                null,
                                '0x000000000000000000000000' + toAddress.slice(2),
                            ],
                        }],
                    id: 1,
                }),
            });
            const data = await res.json();
            if (data.error) {'''

new_no_deposits = '''            if (deposits.length === 0) {
                this.lastProcessedBlock = toBlock;
                return;
            }
            const sourceAddresses = deposits.map((d) => d.source_address?.toLowerCase()).filter(Boolean);
            const toAddress = this.depositAddress.toLowerCase();
            this.logger.debug(`Checking deposits with source addresses: [${sourceAddresses.join(', ')}]`);
            this.logger.debug(`Deposit address (to): ${toAddress}`);
            this.logger.debug(`Scanning blocks ${fromBlock}-${toBlock} (${blocksToScan} blocks)`);
            const fromHex = '0x' + fromBlock.toString(16);
            const toHex = '0x' + toBlock.toString(16);
            const topicTo = '0x000000000000000000000000' + toAddress.slice(2);
            this.logger.debug(`RPC call: eth_getLogs fromBlock=${fromHex}, toBlock=${toHex}, address=${USDT_BSC_CONTRACT}, topic_to=${topicTo}`);
            const res = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getLogs',
                    params: [{
                            address: USDT_BSC_CONTRACT,
                            fromBlock: fromHex,
                            toBlock: toHex,
                            topics: [
                                USDT_TRANSFER_TOPIC,
                                null,
                                topicTo,
                            ],
                        }],
                    id: 1,
                }),
            });
            const data = await res.json();
            if (data.result && data.result.length > 0) {
                this.logger.log(`!!! Found ${data.result.length} raw logs in response for blocks ${fromBlock}-${toBlock} !!!`);
                this.logger.log(`!!! First log: ${JSON.stringify(data.result[0])} !!!`);
            }
            if (data.error) {'''

content = content.replace(old_no_deposits, new_no_deposits)

# Fix 3: Add debug logging for found logs
old_logs = '''            const logs = data.result || [];
            this.logger.debug(`Found ${logs.length} USDT transfer log(s) in blocks ${fromBlock}-${toBlock}`);
            for (const log of logs) {
                const from = '0x' + log.topics[1].slice(26).toLowerCase();
                const amountHex = log.data;
                const amount = parseInt(amountHex, 16) / 1e18;
                const txHash = log.transactionHash;
                const blockNumber = parseInt(log.blockNumber, 16);
                this.logger.debug(`Found transfer: ${amount} USDT from ${from} in block ${blockNumber}, tx: ${txHash.slice(0, 20)}...`);
                this.logger.debug(`Checking if ${from} is in sourceAddresses: [${sourceAddresses.join(', ')}]`);
                if (!sourceAddresses.includes(from)) {'''

new_logs = '''            const logs = data.result || [];
            this.logger.debug(`Found ${logs.length} USDT transfer log(s) in blocks ${fromBlock}-${toBlock}`);
            for (const log of logs) {
                const from = '0x' + log.topics[1].slice(26).toLowerCase();
                const amountHex = log.data;
                const amount = parseInt(amountHex, 16) / 1e18;
                const txHash = log.transactionHash;
                const blockNumber = parseInt(log.blockNumber, 16);
                this.logger.debug(`Found transfer: ${amount} USDT from ${from} in block ${blockNumber}, tx: ${txHash.slice(0, 20)}...`);
                this.logger.debug(`Checking if ${from} is in sourceAddresses: [${sourceAddresses.join(', ')}]`);
                this.logger.debug(`sourceAddresses.includes(${from}) = ${sourceAddresses.includes(from)}`);
                if (!sourceAddresses.includes(from)) {'''

content = content.replace(old_logs, new_logs)

# Fix 4: Update error handling
old_error = '''            if (data.error) {
                this.logger.error(`eth_getLogs error: ${data.error.message}`);
                this.lastProcessedBlock = currentBlock;
                return;
            }'''

new_error = '''            if (data.error) {
                this.logger.error(`eth_getLogs error: ${JSON.stringify(data.error)}`);
                // Don't advance lastProcessedBlock on error - try same range again
                return;
            }'''

content = content.replace(old_error, new_error)

# Fix 5: Update final lastProcessedBlock
old_final = '''            this.lastProcessedBlock = currentBlock;
        }
        catch (error) {'''

new_final = '''            this.lastProcessedBlock = toBlock;
        }
        catch (error) {'''

content = content.replace(old_final, new_final)

# Write the modified JS
with open('/tmp/bscscan-watcher-fixed.js', 'w') as f:
    f.write(content)

print('Done!')