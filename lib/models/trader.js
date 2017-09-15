"use strict";

class Trader {

	trade(){
		return Promise.resolve();
	}

	save(){
		return Promise.resolve();
	}
}

class Trade {
	constructor(type, price, amount){
		this.type = type;
		this.price = price;
		this.amount = amount;
	}
}

module.exports = {Trader, Trade};