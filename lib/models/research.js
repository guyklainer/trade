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
		this.requestID = context.requestID;
	}

	save(db){
		return db.insert(this._buildSaveRequest());
	}

	lookForBuy(){
		let available		= this.balance.NIS,
			potentialSeller = this.stats.ask,
			sellValue 		= potentialSeller.price * potentialSeller.amount,
			discount 		= Math.abs(this.stats.bitcoinILS - potentialSeller.price),
			percent 		= ((discount/this.stats.bitcoinILS) * 100).toFixed(2);

		if(percent < (this.avgs.avg_ask-2)){
			if(sellValue <= available){
				this.actions.push(new Trade("BUY", potentialSeller.price, potentialSeller.amount));
				console.log( `[${this.stats.time}][${this.requestID}] Can ${chalk.green("BUY")} amount of ${chalk.yellow(potentialSeller.amount)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and ${this.avgs.avg_ask-percent} below the AVG sell price which is ${this.avgs.avg_ask}`);

			} else {
				this.actions.push(new Trade("BUY", potentialSeller.price, available / potentialSeller.price));
				console.log( `[${this.stats.time}][${this.requestID}] Can ${chalk.green("BUY")} amount of ${chalk.yellow(available / potentialSeller.price)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and ${this.avgs.avg_ask-percent} below the AVG sell price which is ${this.avgs.avg_ask}`);
			}
		}
	}

	lookForSell(){
		let available		= this.balance.BTC,
			potentialBuyer 	= this.stats.bid,
			buyValue 		= potentialBuyer.price * potentialBuyer.amount,
			discount 		= Math.abs(potentialBuyer.price - this.stats.bitcoinILS),
			percent 		= ((discount/this.stats.bitcoinILS) * 100);

		if(percent > (this.avgs.avg_bid+2)){
			if(buyValue <= available){
				this.actions.push(new Trade("CELL", potentialBuyer.price, potentialBuyer.amount));
				console.log( `[${this.stats.time}][${this.requestID}] Can ${chalk.red("CELL")} amount of ${chalk.yellow(potentialBuyer.amount)} in ${chalk.red(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent.toFixed(2)}%) NIS above the market price and ${percent-this.avgs.avg_bid} above the AVG buy price which is ${this.avgs.avg_bid}`);

			} else {
				this.actions.push(new Trade("CELL", potentialBuyer.price, available));
				console.log( `[${this.stats.time}][${this.requestID}] Can ${chalk.green("CELL")} amount of ${chalk.yellow(available)} in ${chalk.green(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent.toFixed(2)}%) NIS above the market price and ${percent-this.avgs.avg_bid} above the AVG buy price which is ${this.avgs.avg_bid}`);
			}
		}
	}

	_buildSaveRequest(){
		let request = {
			bid : this.stats.bid.price,
			bid_amount : this.stats.bid.amount,
			us_price : this.stats.bitcoinILS,
			ask : this.stats.ask.price,
			ask_amount : this.stats.ask.amount,
			["ask%"] : this.stats.askGap,
			["bid%"] : this.stats.bidGap,
			created_at : this.stats.time.format(consts.TIME_FORMAT)
		};

		if(this.actions[0]){
			request.action = this.actions[0].type;
			request.price = this.actions[0].price;
			request.amount = this.actions[0].amount;
		}

		return request;
	}
}

module.exports = Research;