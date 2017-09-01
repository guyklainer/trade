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

	get(callback){
		let query =  `SELECT * from \`bitcoin\` order by \`created_at\` ASC`;
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