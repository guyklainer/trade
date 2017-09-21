const express = require("express");
const path = require("path");
const publicPath = path.join(__dirname, '..', 'public');
const Rates = require('get-exchange-rates-usd');

class Router {
	constructor(db) {
		Rates().then(rates => this.rates = rates);

		let app = express();

		app.get('/', function (req, res) {
			res.sendFile(path.join(publicPath, 'index.html'));
		});

		app.get('/canvas.js', function (req, res) {
			res.sendFile(path.join(publicPath, 'canvasjs.min.js'));
		});

		app.get('/chart', (req, res) => {
			db.get(req.query.start_date, req.query.end_date).then(rows => {
				let data = this.formatData(rows);
				res.setHeader('Content-Length', JSON.stringify(data).length);
				res.json(data);
			});
		});

		app.listen(3000, function () {
			console.log("Server listening on port 3000");
		});
	}

	formatData(dataArray) {
		let bids = [],
			asks = [],
			us = [];

		for (let i = 0; i < dataArray.length; i++) {
			asks[i] = {y: dataArray[i].ask, x: dataArray[i].created_at, percent: dataArray[i]['ask%']};
			us[i] = {
				y: dataArray[i].us_price,
				x: dataArray[i].created_at,
				us_price: dataArray[i].us_price / this.rates.ILS
			};
			bids[i] = {y: dataArray[i].bid, x: dataArray[i].created_at, percent: dataArray[i]['bid%']};
		}
		return {bids, us, asks};
	}
}

module.exports = Router;