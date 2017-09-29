"use strict";

const consts = require('../../consts');
const {Trade}= require('./trader');
const chalk = require("chalk");
const request = require("request");
const debug = require("debug")("btcm:research");
let skipMarked = {bid: false, ask: false};


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

		const availableAmount = parseFloat((available / potentialSeller.price).toFixed(4));

		if(percent < (this.avgs.avg_ask-2)){
			if(sellValue <= available){
				this.actions.push(new Trade("BUY", potentialSeller.price, potentialSeller.amount));
				const msg = `*Can ${chalk.green("BUY")}* amount of ${chalk.yellow(potentialSeller.amount)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and *${this.avgs.avg_ask-percent}* below the AVG sell price which is ${this.avgs.avg_ask}`;
				this._publish(msg);

				//Limit of minimum 10 NIS for order in bit2c
			} else if(available > 10){
				if(availableAmount > 0){
					this.actions.push(new Trade("BUY", potentialSeller.price, availableAmount));
					const msg = `*Can ${chalk.green("BUY")}* amount of ${chalk.yellow(availableAmount)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and *${this.avgs.avg_ask-percent}* below the AVG sell price which is ${this.avgs.avg_ask}`;
					this._publish(msg);
				}

			} else {
				skipMarked.ask = true;
				const msg = `*Insufficient funds for ${chalk.green("BUY")}* amount of ${chalk.yellow(availableAmount)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and *${this.avgs.avg_ask-percent}* below the AVG sell price which is ${this.avgs.avg_ask}`;
				this._publish(msg);
			}

		} else if(percent < this.avgs.avg_ask){
			if(!skipMarked.ask){
				skipMarked.ask = true;
				const msg = `*Skipped ${chalk.green("BUY")}* amount of ${chalk.yellow(availableAmount)} in ${chalk.green(potentialSeller.price)}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price and *${this.avgs.avg_ask-percent}* below the AVG sell price which is ${this.avgs.avg_ask}`;
				this._publish(msg);
			}

		} else
			skipMarked.ask = false;
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
				const msg = `*Can ${chalk.red("CELL")}* amount of ${chalk.yellow(potentialBuyer.amount)} in ${chalk.red(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent.toFixed(2)}%) NIS above the market price and *${percent-this.avgs.avg_bid}* above the AVG buy price which is ${this.avgs.avg_bid}`;
				this._publish(msg);

			} else {
				this.actions.push(new Trade("CELL", potentialBuyer.price, available));
				const msg = `*Can ${chalk.green("CELL")}* amount of ${chalk.yellow(available)} in ${chalk.green(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent.toFixed(2)}%) NIS above the market price and *${percent-this.avgs.avg_bid}* above the AVG buy price which is ${this.avgs.avg_bid}`;
				this._publish(msg);
			}

		} else if(percent > this.avgs.avg_bid){
			if(!skipMarked.bid){
				skipMarked.bid = true;
				const msg = `*Skipping ${chalk.green("CELL")}* amount of ${chalk.yellow(available)} in ${chalk.green(potentialBuyer.price)}. It's ${chalk.blue(discount)}(${percent.toFixed(2)}%) NIS above the market price and *${percent-this.avgs.avg_bid}* above the AVG buy price which is ${this.avgs.avg_bid}`;
				this._publish(msg);
			}

		} else
			skipMarked.bid = false;
	}

	_publish(text){
		debug(`[${this.stats.time}] ${text} [${this.requestID}]`);

		text = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
		request({
			method: 'GET',
			url: `https://api.telegram.org/bot${process.env.telegram_token}/sendMessage?chat_id=262447304&parse_mode=Markdown&text=${text}\n_${this.requestID}_`
		}, function(error, response, bodyString) {
			let normalResponseCode = '200';

			if (error !== null || (typeof (bodyString) !== 'string') ||
				(response.statusCode + '' !== normalResponseCode)) {
				console.log(new Error('cannot publish to telegram. error: ' + error +
					' reason: ' +
					(response?response.statusCode:'undefined')));
			}
		});

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