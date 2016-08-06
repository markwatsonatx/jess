Jess is a Serveless and GUI-less app developed on top of [IBM API Connect](https://developer.ibm.com/apiconnect/) and [OpenWhisk](https://developer.ibm.com/openwhisk/).

It's a super simple budget tracking app that uses text messages and [Twilio](https://www.twilio.com/). You send Jess
text messages detailing your budget and any additions or subtractions to that budget. Jess responds with your current
balance:

![Jess](http://markwatsonatx.github.io/img/serverless0.png)

You can send one of 4 commands to Jess: Set, Get, Add, or Subtract. As long as your message
includes one (and only one) dollar amount Jess will handle the rest.  

[Click here](http://markwatsonatx.github.io/tutorial/openwhisk/serverless/2016/08/04/serverless-guiless-openwhisk.html) for more details, or try it out yourself at 949-TEL-JESS.

Note: Jess is experimental and using experimental services from Bluemix. It was developed for fun, and I wouldn't be surprised if may encounter the occasional hiccup. If you do please let me know! 

