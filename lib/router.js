const express = require("express");
const path = require("path");

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
			db.get(rows => res.send(formatData(rows)));
		});

		app.listen(3000, function() {
			console.log("Server listening on port 3000");
		});
	}
}

module.exports = Router;


function formatData(dataArray) {
	let bids = [],
		asks = [],
		us = [];

	for(let i = 0; i < dataArray.length; i++) {
		asks[i] = {y: dataArray[i].ask, x: dataArray[i].created_at};
		us[i] = {y: dataArray[i].us_price, x: dataArray[i].created_at};
		bids[i] = {y: dataArray[i].bid, x: dataArray[i].created_at};
	}
	return {bids, us, asks};
}