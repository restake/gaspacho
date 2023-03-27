import Config from "./config.ts";
import { Connection } from "@mysten/sui.js";

import { SuiCalculator } from "./sui/sui_calculator.ts";
import { SuiRpc } from "./sui/sui_rpc.ts";

const connection = new Connection({
    fullnode: Config.SUI_RPC_URL,
});

const rpc = new SuiRpc(connection);
const calculator = new SuiCalculator(rpc, Config.VALIDATOR_ADDRESS);

calculator.initialize().then(() => {
    console.log(`Breakeven RGP: ${calculator.calculate()} MIST`);
});
