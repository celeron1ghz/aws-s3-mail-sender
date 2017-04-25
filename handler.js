'use strict';

var url = require('url');
var https = require('https');

var hookUrl      = process.env.S3_MAIL_SENDER_SLACK_HOOK_URL;
var slackChannel = process.env.S3_MAIL_SENDER_SLACK_CHANNEL;

var postMessage = function(message, callback) {
    var body = JSON.stringify(message);
    var options = url.parse(hookUrl);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };

    var postReq = https.request(options, function(res) {
        var chunks = [];
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            return chunks.push(chunk);
        });
        res.on('end', function() {
            var body = chunks.join('');
            if (callback) {
                callback({
                    body: body,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
};

module.exports.notifier = (event, context, callback) => {
    console.log(JSON.stringify(event));
    var e    = JSON.parse(event.Records[0].Sns.Message);
    var type = e.notificationType;
    var text;
    var attach;
    var icon;
    
    if (type == "Bounce") {
        var b = e.bounce;
        var m = e.mail;
        
        icon = ':warning:';
        text = '*BOUNCE MAIL DETECTED!!!!!*';
        attach = [
            { color: 'warning', title: "Bounce Type",  text: b.bounceType + ' / ' + b.bounceSubType, },
            { color: 'warning', title: "ID",           text: m.messageId, },
            { color: 'warning', title: "From Address", text: m.source, },
            { color: 'warning', title: "To Address",   text: m.destination.toString(), },
            { color: 'warning', title: "Send At",      text: m.timestamp, },
        ];
    }
    else if (type == "Complaint") {
        var c = e.complaint;
        var m = e.mail;
        
        icon = ':warning:';
        text = '*COMPLAINT MAIL DETECTED!!!!!*';
        attach = [
            { color: 'danger', title: "Complaint Type", text: c.complaintFeedbackType, },
            { color: 'danger', title: "ID",             text: m.messageId, },
            { color: 'danger', title: "From Address",   text: m.source, },
            { color: 'danger', title: "To Address",     text: m.destination.toString(), },
            { color: 'danger', title: "Send At",        text: m.timestamp, },
        ];
    } else if (type == "Delivery") {
        var m = e.mail;
        
        icon = ':nico_smile:';
        text = '';
        attach = [{   
            mrkdwn_in: ['text'],
            color: 'good',
            title: 'Sending Mail Success!!', 
            text:  "from = " + m.source + "\nto = [ " + m.destination.toString() + " ]\n\n"
                        + "(ID=" + m.messageId + ", send_at=" + m.timestamp,
        }];
    } else {
        text = type;
        attach = [{   
            color: 'danger',
            text:  "UNKNOWN",
            title: "UNKNOWN",
        }];
    }
    
    var slackMessage = {
        channel: slackChannel,
        text: text,
        mrkdwn: true,
        username: 'Mail Status Notify!!!!!!',
        icon_emoji: icon,
        attachments: attach, 
    };

    postMessage(slackMessage, function(response) {
        if (response.statusCode < 400) {
            console.info('Message posted successfully');
            context.succeed();
        } else if (response.statusCode < 500) {
            console.error("Error posting message to Slack API: " + response.statusCode + " - " + response.statusMessage);
            context.succeed();
        } else {
            context.fail("Server error when processing message: " + response.statusCode + " - " + response.statusMessage);
        }
    });
};
