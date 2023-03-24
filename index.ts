import Config from "./config.ts";
import { Connection } from "@mysten/sui.js";

import { SuiRgp } from "./sui/sui_rgp.ts";
import { SuiRpc } from "./sui/sui_rpc.ts";

const connection = new Connection({
    fullnode: Config.RPC_URL,
});

const rpc = new SuiRpc(connection);
const rgp = new SuiRgp(rpc, Config.VALIDATOR_ADDRESS);

rgp.initialize().then(() => {
    console.log(`Breakeven RGP: ${rgp.calculate()} MIST`);
});
