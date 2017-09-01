const mysql = require('mysql');
const {promisify} 	= require('util');

class DB {
	constructor(){
		this.connection = mysql.createConnection({
			host     : 'localhost',
			user     : 'root',
			password : 'root',
			database : 'local'
		});

		this.connection.connect();

		this.query = promisify(this.connection.query);
	}


	insert(values, callback){
		let query =  `INSERT INTO \`bitcoin\` (\`bid\`, \`bid_amount\`, \`us_price\`, \`ask\`, \`ask_amount\`, \`action\`, \`amount\`, \`price\`, \`sum\`, \`ask%\`, \`bid%\`, \`created_at\`) VALUES (${values.join()})`;

		this.connection.query(query, (err, results)=> {
			if(err)
				console.log(err);
			else
				callback();
		});
	}

	get(date, callback){
		date = date || "2017-08-28";

		let query =  `SELECT * from \`bitcoin\` where \`created_at\` > '${date}' order by \`created_at\` ASC`;
		console.log(date, query);
		this.connection.query(query, (err, results)=> {
			if(err)
				console.log("ERR: ", err);
			else
				callback(results);
		});
	}

	disconnect(){
		this.connection.end();
	}

}

module.exports = DB;