const MySQL = require('mysql');
const {promisify} 	= require('util');
const Utils = require('lodash');
const Moment = require('moment');
const consts = require('../consts');

class DB {
	constructor(){
		this.connection = mysql.createConnection({
			host     : 'localhost',
			user     : 'bitcoin',
			password : '4KkVbuJwAc',
			database : 'bitcoin'
		});

		this.connection.connect();
	}


	insert(data){
		const keys = Utils.keys(data).map( key => `\`${key}\``);
		const values = Utils.values(data).map( value => typeof value == "string" ? `'${value}'` : value);
		const query = `INSERT INTO \`${consts.STATS_TABLE}\` (${keys.join()}) VALUES (${values.join()})`;

		return new Promise((resolve, reject) => {
			this.connection.query(query, (err, res) => {
				if(err)
					reject(err);
				else
					resolve(res);
			});
		});
	}

	get(date){
		let repeats = 0,
			calls = [],
			now = Moment();

		date = date || now.subtract(1, 'd');
		date = Moment(date);

		let until = Moment(date).add(12, 'h').endOf('hour');
		if(until.isAfter(now))
			until = now;

		while( repeats++ < 30 && Moment(date).isBefore(now) && (until.isBefore(now) || until.isSame(now))){
			let query =  `SELECT * from \`${consts.STATS_TABLE}\` where \`created_at\` BETWEEN '${date.format(consts.TIME_FORMAT)}' AND '${until.format(consts.TIME_FORMAT)}' order by \`created_at\` ASC`;

			calls.push(new Promise((resolve, reject) => {
				this.connection.query(query, (err, res) => {
					if(err)
						console.log(err);

					resolve(res);
				});
			}));

			date = Moment(until.add(1,'h').startOf('hour').format());
			until = until.add(12,'h').endOf('hour');
			if(until.isAfter(now))
				until = Moment(now);
		}

		return Promise.all(calls).then(results => {
			let concatenatedResult = [];

			results.forEach(res => concatenatedResult.push(...res));

			return concatenatedResult;
		});
	}

	avg(){
		let query =  `SELECT AVG(\`bid%\`) \`avg_bid\`, AVG(\`ask%\`) \`avg_ask\` from \`${consts.STATS_TABLE}\``;

		return new Promise((resolve, reject) => {
			this.connection.query(query, (err, res) => {
				if(err)
					reject(err);
				else
					resolve(res);
			});
		});
	}

	disconnect(){
		this.connection.end();
	}

}

module.exports = DB;
