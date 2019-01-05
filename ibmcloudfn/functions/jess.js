// $DefaultParam:cloudantUsername
// $DefaultParam:cloudantPassword
// $DefaultParam:cloudantAccount
// $DefaultParam:cloudantUrl
// $DefaultParam:twilioServiceSid

function main(params) {
    const ADD = 'add';
    const SUBTRACT = 'subtract';
    const GET = 'get';
    const SET = 'set';
    return new Promise((resolve) => {
        let cloudant = require('@cloudant/cloudant');
        let db = cloudant({
            username: params.cloudantUsername,
            password: params.cloudantPassword,
            account: params.cloudantAccount,
            url: params.cloudantUrl
        });
        if (!params.MessagingServiceSid || params.MessagingServiceSid !== params.twilioServiceSid) {
            return resolve(getResponse('Not Authorized'));
        }
        if (!params.Body || !params.From) {
            return resolve(getResponse('Inavlid Message'));
        }
        else {
            let operation;
            let body = params.Body.toLowerCase();
            if (body.indexOf(SET) >= 0) {
                operation = SET;
            }
            else if (body.indexOf(ADD) >= 0) {
                operation = ADD;
            }
            else if (body.indexOf(SUBTRACT) >= 0) {
                operation = SUBTRACT;
            }
            else if (body.indexOf(GET) >= 0) {
                operation = GET;
            }
            if (!operation) {
                return resolve(getResponse(`Invalid operation. Send 'set', 'get', 'add', or 'subtract'.`));
            }
            let amount;
            if (operation != GET) {
                let amountRegex = /\d*\.?\d+/g;
                let amountMatches = body.match(amountRegex);
                if (!amountMatches || amountMatches.length == 0) {
                    return resolve(getResponse('Invalid message: No amount specified.'));
                }
                else if (amountMatches.length > 1) {
                    return resolve(getResponse('Invalid message: Too many amounts specified.'));
                }
                amount = Number(amountMatches[0]);
            }
            // get the budget from Cloudant for the phone number passed in
			// create it if it doesn't exist
            loadOrCreateBudget(db, params.From, function (err, budget) {
                if (err) {
					return resolve(getResponse('Oops! Something went wrong. Please try again later. Sorry!'));
                }
                if (operation == SET) {
                    budget.balance = amount;
                }
                else if (operation == ADD) {
                    budget.balance += amount;
                }
                else if (operation == SUBTRACT) {
                    budget.balance -= amount;
                }
                saveBudget(db, budget, function (err, budget) {
                    if (err) {
                        return resolve(getResponse('Oops! Something went wrong. Please try again later. Sorry!'));
                    }
                    let message = {
                        from: params.From,
                        body: params.Body,
                        date: new Date().getTime(),
                        operation: operation,
                        amount: amount
                    };
                    saveMessage(db, message, function (err, result) {
                        if (err) {
                            return resolve(getResponse('Oops! Something went wrong. Please try again later. Sorry!'));
                        }
                        return resolve(getResponse(`Your balance is $${(Math.round(budget.balance * 100) / 100)}`));
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

function getResponse(message) {
    return {
        body: `<Response><Message><Body>${message}</Body></Message></Response>`,
        statusCode: 200,
        headers: {
            'Content-Type': "text/xml",
        },
    };
}