// $DefaultParam:cloudantUsername
// $DefaultParam:cloudantPassword
// $DefaultParam:cloudantAccount
// $DefaultParam:cloudantUrl

function main(params) {
	return new Promise((resolve, reject) => {
        let cloudant = require('cloudant');
        let db = cloudant({
            username: params.cloudantUsername,
            password: params.cloudantPassword,
            account: params.cloudantAccount,
            url: params.cloudantUrl
        });
        if (!params.message.body || !params.message.from) {
            return {"message": "Invalid message"};
        }
        else {
            let operation;
            let body = params.message.body.toLowerCase();
            if (body.indexOf('set') >= 0) {
                operation = 'set';
            }
            else if (body.indexOf('add') >= 0) {
                operation = 'add';
            }
            else if (body.indexOf('subtract') >= 0) {
                operation = 'subtract';
            }
            else if (body.indexOf('get') >= 0) {
                operation = 'get';
            }
            if (!operation) {
                return resolve({"message": "Invalid operation. Send 'set', 'get', 'add', or 'subtract'."});
            }
            let amount;
            if (operation != 'get') {
                let amountRegex = /\d*\.?\d+/g;
                let amountMatches = body.match(amountRegex);
                if (!amountMatches || amountMatches.length == 0) {
                    return resolve({"message": "Invalid message: No amount specified."});
                }
                else if (amountMatches.length > 1) {
                    return resolve({"message": "Invalid message: Too many amounts specified."});
                }
                amount = Number(amountMatches[0]);
            }
            // get the budget from Cloudant for the phone number passed in
			// create it if it doesn't exist
            loadOrCreateBudget(db, params.message.from, function (err, budget) {
                if (err) {
					return resolve({"message": "Oops! Something went wrong. Please try again later. Sorry!"});
                }
                if (operation == 'set') {
                    budget.balance = amount;
                }
                else if (operation == 'add') {
                    budget.balance += amount;
                }
                else if (operation == 'subtract') {
                    budget.balance -= amount;
                }
                saveBudget(db, budget, function (err, budget) {
                    if (err) {
                        return resolve({"message": "Oops! Something went wrong. Please try again later. Sorry!"});
                    }
                    let message = {
                        from: params.message.from,
                        body: params.message.body,
                        date: new Date().getTime(),
                        operation: operation,
                        amount: amount
                    };
                    saveMessage(db, message, function (err, result) {
                        if (err) {
                            return resolve({"message": "Oops! Something went wrong. Please try again later. Sorry!"});
                        }
                        return resolve({"message": "Your balance is $" + (Math.round(budget.balance * 100) / 100)});
                    });
                });
            });
        }
    });
}

function loadOrCreateBudget(cloudant, id, callback) {
	let budgetsDb = cloudant.use('jess_budgets');
	budgetsDb.get(id, { include_docs: true }, function (err, result) {
		if (err && err.statusCode != 404) {
            callback(err, result);
        }
        else if (result) {
			callback(err, result);
        }
        else {
			budget = {
				_id: id,
				balance: 0,
				create_date: new Date().getTime()
			};
			saveBudget(cloudant, budget, callback);
        }
    });
}

function saveBudget(cloudant, budget, callback) {
	let budgetsDb = cloudant.use('jess_budgets');
	budgetsDb.insert(budget, function (err, result) {
        if (err) {
			callback(err, result);
        }
        else {
            budget._id = result.id;
            budget._rev = result.rev;
            callback(err, budget);
        }
    });
}

function saveMessage(cloudant, message, callback) {
	let messagesDb = cloudant.use('jess_messages');
	messagesDb.insert(message, function (err, result) {
        if (err) {
			callback(err, result);
        }
        else {
            message._id = result.id;
            message._rev = result.rev;
            callback(err, message);
        }
    });
}