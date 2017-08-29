"use strict";

const bit2c 		= require("bit2c");
const chalk 		= require("chalk");
const moment 		= require('moment');
const Bitstamp 		= require('bitstamp');
const Rates 		= require('get-exchange-rates-usd');
const {promisify} 	= require('util');
const DB 			= require("./db");

class Trader {
	constructor(){
		this.db = new DB();

		this.creds = {
			key: process.env.bitcoin_key,
			secret: process.env.bitcoin_secret
		}
	}

	work(){
		Object.keys(bit2c).forEach(method => bit2c[`${method}Async`] = promisify(bit2c[method]));
		let bitstamp = new Bitstamp(),
			bitstampTicker 	= promisify(bitstamp.ticker_hour),
			calls 			= [];

		calls.push(bitstampTicker('btcusd'));
		calls.push(bit2c.getTickerAsync('BtcNis'));
		calls.push(bit2c.getOrderBookAsync('BtcNis'));
		calls.push(bit2c.getBalanceAsync(this.creds));
		calls.push(Rates());

		return Promise.all(calls).then( ([bitstamp, bit2c, bit2cOrders, balance, rates]) => {
			let action = null;

			const bitstampInNIS = bitstamp.last*rates.ILS;
			console.log(`${chalk.yellow("----------")}[${moment()}]${chalk.yellow("----------")}`);
			console.log(chalk.white(`bit2c: ${chalk.yellow(bit2c.ll)}, bitstamp: ${chalk.yellow(bitstampInNIS)} NIS (${bitstamp.last} USD in ${rates.ILS} rate) (${ bitstampInNIS - bit2c.ll})`));

			const buyOptions = this.calcBuyOptions(balance, bit2cOrders.asks, bitstampInNIS);
			if(buyOptions.sum > 0){
				action = "BUY";
				console.log(`The total buy transaction will be ${chalk.green(buyOptions.sum)} NIS which are ${chalk.green(buyOptions.count)} BTC in the AVG price of ${chalk.green(buyOptions.price)}`);
			}

			const sellOptions = this.calcSellOptions(balance, bit2cOrders.bids, bitstampInNIS);
			if(sellOptions.sum > 0){
				action = "SELL";
				console.log(`The total sell transaction will be ${chalk.red(sellOptions.sum)} NIS which are ${chalk.red(sellOptions.count)} BTC in the AVG price of ${chalk.red(sellOptions.price)}`);
			}

			let values = [bit2cOrders.bids[0][0], bit2cOrders.bids[0][1], bitstampInNIS, bit2cOrders.asks[0][0], bit2cOrders.asks[0][1]];
			if( action == "BUY")
				values.push("BUY", buyOptions.count, buyOptions.price, buyOptions.sum);
			else if( action == "SELL")
				values.push("'SELL'", sellOptions.count, sellOptions.price, sellOptions.sum);
			else if ( sellOptions.sum == -1 )
				values.push("'POTENTIAL SELL'", sellOptions.count, sellOptions.price, sellOptions.count*sellOptions.price);
			else if ( buyOptions.sum == -1 )
				values.push("'POTENTIAL BUY'", buyOptions.count, buyOptions.price, buyOptions.count*buyOptions.price);
			else
				values.push("NULL", "NULL", "NULL", "NULL");

			values.push(`'${moment().format('YYYY-MM-DD HH:mm:ss')}'`);
			this.db.insert(values);

			// console.log(chalk.blue(`Bitstamp: ${bitstamp.last} USD => ${bitstampInNIS} NIS (${rates.ILS})`));
			// console.log(chalk.white(`Last price: ${bit2c.ll} (${ bitstampInNIS - bit2c.ll})`));
			//
			// // someone selling in low?
			// console.log(chalk.red(`Sell: ${bit2c.l} (${ bitstampInNIS - bit2c.l} ${bitstampInNIS - bit2c.l > 0 ? "BUY!!" : ""})`));
			//
			// // someone buying in expensive?
			// console.log(chalk.green(`Buy: ${bit2c.h} (${ bit2c.h - bitstampInNIS} ${bit2c.h - bitstampInNIS > 0 ? "SELL!!" : ""})`));
			// console.log(chalk.yellow("-------------------------"));

			console.log(`${chalk.yellow("----------\n")}`);
		})
			.catch( e => console.log(e));
	}

	calcBuyOptions(balance, asks, bitstampInNIS){
		let available	= balance.NIS,
			sum 	  	= 0,
			count 		= 0,
			price 		= null;

		for( let i = 0; i < asks.length; i++ ){
			let ask = asks[i];
			let currVal = ask[0] * ask[1];

			if(ask[0] < bitstampInNIS){
				let discount = bitstampInNIS - ask[0],
					percent = ((discount/bitstampInNIS) * 100).toFixed(2);

				if(sum < available){
					if((sum + currVal) <= available){
						console.log( `Can ${chalk.green("BUY")} from ${i} amount of ${chalk.yellow(ask[1])} in ${chalk.green(ask[0])}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price`);
						sum += currVal;
						count += ask[1];

					} else {
						console.log( `Can ${chalk.green("BUY")} from ${i} amount of ${chalk.yellow((available - sum) / ask[0])} in ${chalk.green(ask[0])}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price`);
						count += (available - sum) / ask[0];
						sum = available;
						break;
					}

				} else {
					if( i === 0 ){
						sum = -1;
						count = ask[1];
						price = ask[0];
						this.log(`Had a potential ${chalk.green("BUY")} of ${chalk.yellow(ask[1])} units in ${chalk.green(ask[0])}. It's ${chalk.blue(discount)}(${percent}%) NIS below the market price. But no sufficient funds`);
					}
					break;
				}

			} else
				break;
		}

		return {
			sum,
			count,
			price: price || sum/count
		}
	}

	calcSellOptions(balance, bids, bitstampInNIS){
		let available	= balance.BTC,
			count 	  	= 0,
			sum 		= null,
			price 		= null;

		for( let i = 0; i < bids.length; i++ ){
			let bid = bids[i];

			if(bid[0] > bitstampInNIS){
				let profit = bid[0] - bitstampInNIS,
					percent = ((profit/bitstampInNIS)*100).toFixed(2);

				if(count < available){
					price = bid[0];

					if(bid[1] <= available){
						console.log( `Can ${chalk.red("SELL")} to ${i} amount of ${chalk.yellow(bid[1])} in ${chalk.red(bid[0])}. It's ${chalk.blue(profit)}(${percent}%) NIS above the market price`);
						count += bid[1];

					} else {
						console.log( `Can ${chalk.red("SELL")} to ${i} amount of ${chalk.yellow(available-count)} in ${chalk.red(bid[0])}. It's ${chalk.blue(profit)}(${percent}%) NIS above the market price`);
						count = available;
						break;
					}

				} else {
					if(i == 0){
						sum = -1;
						count = bid[1];
						this.log(`Had a potential ${chalk.red("SELL")} of ${chalk.yellow(bid[1])} units in ${chalk.red(bid[0])}. It's ${chalk.blue(profit)}(${percent}%) NIS above the market price. But no sufficient funds`);
					}
					break;
				}

			} else
				break;
		}

		return {
			sum: sum || count * price,
			count,
			price
		}
	}

	log(msg){
		console.log(`[${moment()}] - ${msg}`)
	}
}

module.exports = Trader;
