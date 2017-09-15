"use strict";

const consts = require('../../consts');
const {Trade}= require('./trader');
const chalk = require("chalk");


class Research {
	constructor(context){
		this.stats = context.stats;
		this.balance = context.balance;
		this.orderBook = context.orderBook;
		this.avgs = context.avgs;
		this.actions = [];
	}

	save(db){
		return db.insert(this._buildSaveRequest());
	}

	lookForBuy(){
		let available		= this.balance.NIS,
			potentialSeller = this.stats.ask,
			sellValue 		= potentialSeller.price * potentialSeller.amount;

		if(potentialSeller.price < this.stats.bitcoinILS){
			let discount = this.stats.bitcoinILS - potentialSeller.price,
				percent = ((discount/this.stats.bitcoinILS) * 100).toFixed(2);

			if(sellValue <= available){
				this.actions.push(new Trade("BUY", potentialSeller.price, potentialSeller.amount));
				console.log( `Can ${chalk.green("BUY")} amount of ${chalk.yellow(potentialSeller.amount)} in ${chalk.green(potentialSeller[0])}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price`);

			} else {
				this.actions.push(new Trade("BUY", potentialSeller.price, available / potentialSeller.price));
				console.log( `Can ${chalk.green("BUY")} amount of ${chalk.yellow(available / potentialSeller[0])} in ${chalk.green(potentialSeller[0])}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price`);
			}
		}
	}

	lookForSell(){
		let available		= this.balance.BTC,
			potentialBuyer 	= this.stats.bid,
			buyValue 		= potentialBuyer.price * potentialBuyer.amount;

		if(potentialBuyer.price > this.stats.bitcoinILS){
			let discount = potentialBuyer.price - this.stats.bitcoinILS,
				percent = ((discount/this.stats.bitcoinILS) * 100).toFixed(2);

			if(buyValue <= available){
				this.actions.push(new Trade("CELL", potentialBuyer.price, potentialBuyer.amount));
				console.log( `Can ${chalk.red("CELL")} amount of ${chalk.yellow(potentialBuyer.amount)} in ${chalk.red(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS above the market price`);

			} else {
				this.actions.push(new Trade("CELL", potentialBuyer.price, available));
				console.log( `Can ${chalk.green("CELL")} amount of ${chalk.yellow(available)} in ${chalk.green(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS above the market price`);
			}
		}
	}

	_buildSaveRequest(){
		return {
			bid : this.stats.bid.price,
			bid_amount : this.stats.bid.amount,
			us_price : this.stats.bitcoinILS,
			ask : this.stats.ask.price,
			ask_amount : this.stats.ask.amount,
			["ask%"] : this.stats.askGap,
			["bid%"] : this.stats.bidGap,
			created_at : this.stats.time.format(consts.TIME_FORMAT)
		}
	}
}

module.exports = Research;