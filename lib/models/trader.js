"use strict";

const bit2c = require("bit2c");
const Moment = require('moment');
const consts = require('../../consts');

const debug = require("debug")("btcm:trader");

class Trader {

	constructor(context, research){
		this.context = context;
		this.research = research;
		this.prefix = `[${this.context.stats.time}][${this.context.requestID}]`;
		this.cancelerCount = 0;
	}

	addOrder(){
		const trade = this.research.actions[0];

		if(trade.isValid()){
			debug(`${this.prefix} add_order: ${JSON.stringify(trade.getRequest())}`);

			if(this.context.env !== "production") {
				return Promise.resolve();
			}

			return bit2c.addOrderAsync(this.context.creds, trade.getRequest())
				.then(res => {
					debug(`${this.prefix} add_order_success: ${JSON.stringify(trade.getRequest())}`);
				})
				.catch(err => {
					debug(`${this.prefix} add_order_failed: ${JSON.stringify(trade.getRequest())}`);
				});

		} else {
			debug(`${this.prefix} invalid_trade: ${JSON.stringify(trade.getRequest())}`);
			return Promise.reject("invalid_trade");
		}
	}

	fillOrKill(){
		if(this.context.env !== "production"){
			return Promise.resolve();
		}

		const pair = this.research.actions[0].pair;

		return bit2c.getMyOrdersAsync(this.context.creds, pair)
			.then(data => data[pair])
			.then(data => {
				if(!data.bid && !data.ask || this.cancelerCount++ > 10)
					return Promise.resolve();

				else {
					return Promise.all([
						this.cancelOrders(data.bid),
						this.cancelOrders(data.ask)
					])
				}
			})
	}

	cancelOrders(orders){
		if(!(orders instanceof Array))
			return Promise.resolve();

		let calls = orders.map(order => {
			debug(`${this.prefix} canceling_${this.cancelerCount}: ${JSON.stringify(order)}`);

			return bit2c.cancelOrderAsync(this.context.creds, order.id)
				.then(_ => debug(`${this.prefix} canceled: ${JSON.stringify(order)}`))
				.catch(err => debug(`${this.prefix} failed_to_cancel: ${err} ${order}`))
		});

		Promise.all(calls).then(_ => this.fillOrKill());
	}

	save(db){
		const trade = this.research.actions[0];

		let params = {
			action: trade.type,
			price: trade.price,
			amount: trade.amount,
			created_at: Moment().format(consts.TIME_FORMAT),
			status: "SUCCESS"
		};

		return db.saveTrade(params);
	}
}

class Trade {
	constructor(type, price, amount){
		this.type = type;
		this.price = price;
		this.amount = amount;
		this.pair = "BtcNis";
	}

	isValid(){
		return this.type && this.price && this.amount;
	}

	getRequest(){
		return {
			Amount: this.amount,
			Price: this.price,
			Total: this.amount*this.price,
			IsBid: this.type === "BUY",
			Pair: this.pair
		}
	}
}

module.exports = {Trader, Trade};