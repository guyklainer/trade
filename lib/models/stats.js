"use strict";

const Moment = require('moment');

class Stats {
	constructor(context){
		let bid = context.bit2cOrders.bids[0],
			ask = context.bit2cOrders.asks[0];

		this.bid = { price : bid[0], amount : bid[1] };
		this.ask = { price : ask[0], amount : ask[1] };
		this.bit2cLast = context.bit2c.ll;
		this.bitcoinUSD = context.bitstamp.last;
		this.rateToILS = context.rates.ILS;
		this.bitcoinILS = this.bitcoinUSD * this.rateToILS;
		this.askGap = (100*(this.ask.price/this.bitcoinILS))-100;
		this.bidGap = (100*(this.bid.price/this.bitcoinILS))-100;
		this.time = Moment();
	}
}

module.exports = Stats;