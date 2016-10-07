fbot
=========

Node module, that allows to set up Facebook Messenger bot server in few minutes.

## Installation
  ```bash
  $ npm install fbot
  ```

## Usage
```javascript
var diff = require('fbot');
```

## Examples  

Simple example with welcome action, responds on every message after 2 minutes of user inactivity (timeout variable).

```javascript
var bot = require('fbot');
bot.initialize(YOUR_ACCESS_TOKEN, YOUR_PROFILE_ID, TOKEN_VERIFICATION_NAME)
bot.runServer('localhost', process.env.PORT);

bot.setWelcomeAction(function(params){
    var senderid = params.sender;
    var userDetails = bot.getUserDetails(params.sender);    
    var fbUserFirstName = userDetails.first_name;
    bot.sendTextMessage('Hello ' + fbUserFirstName + os.EOL + 'We are happy to see you here.', params);
}, 2); 
//2 = 2 minutes of timeout (after that time message will be send again if user sends any text)

```

## Usage

You can see usage here: https://github.com/jarekmachaj/ruczaj-bot. App is being hosted on Heroku.

 


  