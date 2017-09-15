const Main = require("./lib/index");
const DB = require("./lib/db");
const Router = require("./lib/router");

let db = new DB();
let main = new Main(db);
let router = new Router(db);

interval();

function interval(){
	setTimeout( _ => main.work().then(_ => interval()), 3000);
}