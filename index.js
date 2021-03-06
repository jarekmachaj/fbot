var express = require('express');
var bodyParser = require('body-parser');
var synRequest = require('sync-request'); //from npm
var request = require('request'); //from npm
var querystring = require('querystring'); //from npm
var logger = require('fast-logger');
var diff = require('datetime-diff');
        
var msgBot = function(){    
    this._fbProtocol = 'https://'
    this._fbHost = "graph.facebook.com";
    this._fbApiVersion = "v2.6";
    this._actions = [];
    this._defaultAction = function() { console.log('Set the default action...'); };
    this._welcomeAction = undefined;
    this,_welcomeTimeout = 0;
    this._reservedActionNames = ['default', 'error', 'welcome'];
    this._initalized = false;
    this._lastUserMessage = {}; //message
    this._app = express();
}

msgBot.prototype.initialize = function(appAccessToken, pageProfileId, verifyTokenName) {
    if (appAccessToken == undefined || appAccessToken == null) throw 'Access token is missing';
    this._pageProfileId = pageProfileId; //so it won't send messanges to itself
    this._verifyTokenName = verifyTokenName;  
    this._appAccessToken = appAccessToken;  
    this._initalized = true;

    this._app.use(bodyParser.urlencoded({extended: false}));
    this._app.use(bodyParser.json());
}

msgBot.prototype.runServer = function(serverHost, serverPort){   
    var that = this;

    this._app.listen(serverPort, serverHost, function() {
        logger.log('Listening on port ' + serverPort);        
    });

    // Server frontpage
    this._app.get('/', function (req, res) {
        res.send('Bot says hello!');
    });

    // Facebook Webhook
    this._app.all('/webhook', function (req, res) {
        that.fbWebhook(req, res);    
    });
}

//ie: buildGraphUrl([12435436] - array, {fields : 'first_name,secondName''})
//https://graph.facebook.com/v2.6/me/messages?access_token=PAGE_ACCESS_TOKEN
//https://graph.facebook.com/v2.6/[senderid]/?fields=first_name&access_token=[token]'
msgBot.prototype.buildGraphUrl = function(params, queryParams){
    var query = this._fbProtocol + this._fbHost + '/' + this._fbApiVersion;
    if (params != null && params != undefined && params.length > 0) query = query + '/' + params.join('/');
    if (queryParams != null && queryParams != undefined) query = query + '?' + querystring.stringify(queryParams);  
    return query;  
}

//attach and run from HTTP GET||POST /webhook
msgBot.prototype.fbWebhook = function(req, res) {
    if (req.method == "GET"){
        if (req.query['hub.verify_token'] === this._verifyTokenName) {
            res.send(req.query['hub.challenge']);
        } else {
            res.send('Invalid verify token');
        }        
        return;
    } else {
        var messaging_events = req.body.entry[0].messaging;
        for (var i = 0; i < messaging_events.length; i++) {
            var event = req.body.entry[0].messaging[i];            
            if (this._pageProfileId != undefined && event.sender.id == this._pageProfileId) continue;            
            
            var sender = event.sender.id;        
            if (event.message && event.message.text) {
                var text = event.message.text
                this.takeAction(text, {sender: sender});
            }
        }
        res.sendStatus(200);
    }
}

//ie addaction('sendMsg', function(){console.log('message sent');})
msgBot.prototype.setAction = function (name, action) {
    if (this._reservedActionNames.indexOf(name) < 0) throw 'Action name ' + name, ' is forbidden';
    this._actions[name] = action;
}

//ie setDefaultAction(function(){console.log('message sent');})
msgBot.prototype.setDefaultAction = function (action) {
    this._defaultAction = action;
}


//adds user acees (date) + returns last access
msgBot.prototype.setUserAccess = function(userId){
     this._lastUserMessage[userId] = new Date();
}

//adds user acees (date) + returns last access
msgBot.prototype.getUserAccess = function(userId){
    return this._lastUserMessage[userId];
}

//welcome action fires up, after first message from contact (timeout needed) 
msgBot.prototype.setWelcomeAction = function(action, timeout) {
    this._welcomeAction = action;
    this._welcomeTimeout = timeout;
}

//action here is a text message from user - determining next steps
msgBot.prototype.takeAction = function(action, params){  
    var selectedAction = this._defaultAction;   
    var userId = params.sender;    
    logger.log('taking action (takeAction), userid:' + userId);
    var minutesdiff = diff(new Date(), this.getUserAccess(params.sender)).minutes;
    logger.log('diff last access (mins):', minutesdiff);
    logger.log('Welcome timout:', this._welcomeTimeout); 
    if (minutesdiff < 0 || minutesdiff > this._welcomeTimeout) {
            logger.log('taking welcome action');                 
            selectedAction = this._welcomeAction;
            logger.log('timeout ok, searching welcome action');            
    } else {
        for (var i = 0; i < this._actions.length; i++){
            if (action.indexOf(this._actions[i]) >= 0) {
                selectedAction = this._actions[i];
                break;
            }
        }    
    }    
    if (selectedAction != undefined && selectedAction != null) {
        selectedAction(params);
        this.setUserAccess(params.sender);
    }       

}

msgBot.prototype.sendTextMessage = function(msg, params){
    var recipientid = params.sender;
    var messageData = { text:msg }

    logger.log('sending message: ' + msg + ' -----params : ' + params);
    var that = this;
    request({
        url: this.buildGraphUrl(['me', 'messages'], {'access_token' : that._appAccessToken}),
        method: 'POST',
        json: {
            recipient: {id: recipientid},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            logger.log('Error sending messages: ', error)
        } else if (response.body.error) {
            logger.log('Error: ', response.body.error)
        }
    })
}

msgBot.prototype.getUserDetails = function(senderid) {
    logger.log('get user details: ' + senderid);
    var url =  this.buildGraphUrl([senderid], {fields : 'first_name', access_token : this._appAccessToken});
    logger.log('get user details, url: ' + url);
    var res = synRequest('GET', url);
    var user = JSON.parse(res.getBody('utf8'));
    return user;
}

var fbot = new msgBot();
module.exports = fbot;