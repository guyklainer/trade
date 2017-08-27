const Trader = require("./lib/trader");

let trader = new Trader();
interval();

function interval(){
	setTimeout( _ => trader.work().then(_ => interval()), 3000);
}