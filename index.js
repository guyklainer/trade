const Trader = require("./lib/trader");
const DB = require("./lib/db");
const Router = require("./lib/router");

let db = new DB();
let trader = new Trader(db);
let router = new Router(db);

interval();

function interval(){
	setTimeout( _ => trader.work().then(_ => interval()), 3000);
}