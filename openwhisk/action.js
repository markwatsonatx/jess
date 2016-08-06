function main(params) {
	var cloudant = require('cloudant');
	var db = cloudant({
		username: 'XXXXXXXXXX-bluemix',
		password: 'XXXXXXXXXX',
		account: 'XXXXXXXXXX-bluemix.cloudant.com',
		url: 'https://XXXXXXXXXX-bluemix:XXXXXXXXXX@XXXXXXXXXX-bluemix.cloudant.com'
	});
	if (! params.message.body || ! params.message.from) {
		return { "message": "Invalid message" };
	}
	else {
		var operation;
		var body = params.message.body.toLowerCase();
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
		if (! operation) {
			return whisk.done({ "message": "Invalid operation. Send 'set', 'get', 'add', or 'subtract'." });
		}
		var amount;
		if (operation != 'get') {
			var amountRegex = /\d*\.?\d+/g;
			var amountMatches = body.match(amountRegex);
			if (! amountMatches || amountMatches.length == 0) {
				return whisk.done({ "message": "Invalid message: No amount specified." });
			}
			else if (amountMatches.length > 1) {
				return whisk.done({ "message": "Invalid message: Too many amounts specified." });
			}
			amount = Number(amountMatches[0]);
		}
		//
		loadOrCreateBudget(db, params.message.from, function(err, budget) {
			if (err) {
        		return whisk.done({ "message": "Oops! Something went wrong. Please try again later. Sorry!" });
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
    		saveBudget(db, budget, function(err, budget) {
    			if (err) {
        			return whisk.done({ "message": "Oops! Something went wrong. Please try again later. Sorry!" });
        		}
    			var message = {
					from: params.message.from,
					body: params.message.body,
					date: new Date().getTime(),
					operation: operation,
					amount: amount
				};
				saveMessage(db, message, function (err, result) {
        			if (err) {
            			return whisk.done({ "message": "Oops! Something went wrong. Please try again later. Sorry!" });
            		}
            		return whisk.done({ "message": "Your balance is $" + (Math.round(budget.balance*100)/100) });
            	});
    		});
        });
    };
    return whisk.async();
}

function loadOrCreateBudget(cloudant, id, callback) {
	console.log("Loading or creating budget for " + id);
	var budgetsDb = cloudant.use('jess_budgets');
	budgetsDb.get(id, {include_docs: true}, function (err, result) {
		if (err && err.statusCode != 404) {
            console.log("Error loading budget for " + id + ": " + err);
            callback(err, result);
        }
        else if (result) {
        	console.log("Budget exists for " + id + ": " + JSON.stringify(result));
        	callback(err, result);
        }
        else {
        	console.log("Budget does not exist for " + id);
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
	console.log("Saving budget " + JSON.stringify(budget));
	var budgetsDb = cloudant.use('jess_budgets');
	budgetsDb.insert(budget, function(err, result) {
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
	var messagesDb = cloudant.use('jess_messages');
	messagesDb.insert(message, function(err, result) {
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