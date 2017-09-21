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

	get(start, end){
		let now = Moment();

		start = start || now.subtract(1, 'd');
		start = Moment(start);
		end = end || now;
		end = Moment(end);
		console.log(`${start} - ${end}`);

		let query =  `SELECT * from \`${consts.STATS_TABLE}\` where \`created_at\` BETWEEN '${start.format(consts.TIME_FORMAT)}' AND '${end.format(consts.TIME_FORMAT)}' order by \`created_at\` ASC`;

		return new Promise((resolve, reject) => {
			this.connection.query(query, (err, res) => {
				if(err)
					console.log(err);

				resolve(res);
			});
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
