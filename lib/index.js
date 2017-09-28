"use strict";

const bit2c 		= require("bit2c");
const chalk 		= require("chalk");
const moment 		= require('moment');
const Bitstamp 		= require('bitstamp');
const Rates 		= require('get-exchange-rates-usd');
const {promisify} 	= require('util');
const Stats 		= require('./models/stats');
const Research 		= require('./models/research');
const {Trader} 		= require('./models/trader');
const uuidv4 		= require('uuid/v4');

class Context {
	constructor(rates, avgs, creds){
		this.env = process.env.env || "dev";
		this.rates = rates;
		this.avgs = avgs;
		this.creds = creds;
		this.requestID = uuidv4();
	}
}

class Main {
	constructor(db){
		this.bitstamp = new Bitstamp();
		this.db = db;

		this.creds = {
			key: process.env.bitcoin_key,
			secret: process.env.bitcoin_secret
		};

		Object.keys(bit2c).forEach(method => bit2c[`${method}Async`] = promisify(bit2c[method]));
		this.bitstamp.ticker_hour = promisify(this.bitstamp.ticker_hour);
	}

	work(){
		return this.createContext()
			.then(context => this.iterateData(context))
			.catch( e => console.log(e));
	}

	createContext(){
		return Promise.all([Rates(), this.db.avg(), this.creds])
			.then(data => new Context(...data));
	}

	iterateData(context){
		let calls = [];
		this.context = context;

		calls.push(this.bitstamp.ticker_hour('btcusd'));
		calls.push(bit2c.getTickerAsync('BtcNis'));
		calls.push(bit2c.getOrderBookAsync('BtcNis'));
		calls.push(bit2c.getBalanceAsync(this.creds));

		return Promise.all(calls)
			.then( ([bitstamp, bit2c, bit2cOrders, balance]) => {
				if(arguments.length === 0)
					return;

				context.bitstamp = bitstamp;
				context.bit2c = bit2c;
				context.bit2cOrders = bit2cOrders;
				context.balance = balance;
				context.stats = new Stats(context);

				console.log(`${chalk.yellow("----------")}[${context.stats.time}]${chalk.yellow("----------")}`);
				console.log(chalk.white(`bit2c: ${chalk.yellow(bit2c.ll)}, bitstamp: ${chalk.yellow(context.stats.bitcoinILS)} NIS (${bitstamp.last} USD in ${context.rates.ILS} rate) (${ context.stats.bitcoinILS - bit2c.ll})`));

				let research = new Research(context);

				research.lookForBuy();
				research.lookForSell();

				if(research.actions.length > 0){
					let trader = new Trader(context, research);
					trader.addOrder()
						.then(_ => trader.fillOrKill())
						.then(_ => trader.save(this.db))
						.then(_ => this.closingLine())
						.catch(err => err)

				} else
					this.closingLine();


				research.save(this.db);
		})
	}

	closingLine(){
		console.log(`${chalk.yellow("----------")}[${this.context.requestID}]${chalk.yellow("----------\n")}`);
	}
}

module.exports = Main;
