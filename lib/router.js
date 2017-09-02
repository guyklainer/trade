const express = require("express");
const path = require("path");
const Rates = require('get-exchange-rates-usd');

class Router {
	constructor(db){
		let app = express();

		app.get('/', function(req, res) {
			res.sendFile(path.join(__dirname, 'index.html'));
		});

		app.get('/canvas.js', function(req, res) {
			res.sendFile(path.join(__dirname, 'canvasjs.min.js'));
		});

		app.get('/chart', (req, res) => {
			Rates().then(rates => {
				db.get(req.query.start_date, rows => {
					let data = formatData(rows, rates.ILS);
					res.setHeader('Content-Length', JSON.stringify(data).length);
					res.json(data);
				});
			});
		});

		app.listen(3000, function() {
			console.log("Server listening on port 3000");
		});
	}
}

module.exports = Router;


function formatData(dataArray, rate) {
	let bids = [],
		asks = [],
		us = [];

	for(let i = 0; i < dataArray.length; i++) {
		asks[i] = {y: dataArray[i].ask, x: dataArray[i].created_at, percent: dataArray[i]['ask%']};
		us[i] = {y: dataArray[i].us_price, x: dataArray[i].created_at, us_price: dataArray[i].us_price/rate};
		bids[i] = {y: dataArray[i].bid, x: dataArray[i].created_at, percent: dataArray[i]['bid%']};
	}
	return {bids, us, asks};
}