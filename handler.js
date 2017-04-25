'use strict';
const METHODS = {
    Bounce: e => {
        let b = e.bounce;
        let m = e.mail;
        return {
            text:        '*BOUNCE MAIL DETECTED!!!!!*',
            icon_emoji:  ':warning:',
            attachments: [
                { color: 'warning', title: "Bounce Type",  text: b.bounceType + ' / ' + b.bounceSubType, },
                { color: 'warning', title: "ID",           text: m.messageId, },
                { color: 'warning', title: "From Address", text: m.source, },
                { color: 'warning', title: "To Address",   text: m.destination.toString(), },
                { color: 'warning', title: "Send At",      text: m.timestamp, },
            ],
        }
    },
    Complaint: e => {
        let c = e.complaint;
        let m = e.mail;
        return {
            text:        '*COMPLAINT MAIL DETECTED!!!!!*',
            icon_emoji:  ':warning:',
            attachments: [
                { color: 'danger', title: "Complaint Type", text: c.complaintFeedbackType, },
                { color: 'danger', title: "ID",             text: m.messageId, },
                { color: 'danger', title: "From Address",   text: m.source, },
                { color: 'danger', title: "To Address",     text: m.destination.toString(), },
                { color: 'danger', title: "Send At",        text: m.timestamp, },
            ],
        };
    },
    Delivery: e => {
        let m = e.mail;
        return {
            text:        '',
            icon_emoji:  ':nico_smile:',
            attachments: [{
                mrkdwn_in: ['text'],
                color: 'good',
                title: 'Sending Mail Success',
                text:  `From = ${m.source}` + "\n" +
                       `To = [ ${m.destination.toString()} ]` + "\n" +
                       `ID = ${m.messageId}` + "\n" +
                       `SendAt = ${m.timestamp}`,
            }],
        };
    },
};

const Slack = require('slack-node');
const slack = new Slack();
slack.setWebhook(process.env.S3_MAIL_SENDER_SLACK_HOOK_URL);

module.exports.notifier = (event, context, callback) => {
    //console.log(JSON.stringify(event));
    const e    = JSON.parse(event.Records[0].Sns.Message);
    const type = e.notificationType;
    const meth = METHODS[type];
    let ret;

    if (meth)   {
        ret = meth(e);
    } else {
        ret = {
            icon_emoji:  null,
            text:        type,
            attachments: [{
                color: 'danger',
                text:  "UNKNOWN",
                title: "UNKNOWN",
            }],
        };
    }

    ret.channel  = process.env.S3_MAIL_SENDER_SLACK_CHANNEL;
    ret.mrkdwn   = true;
    ret.username = 'Mail Status Notify';

    Promise.resolve()
        .then(data =>
            new Promise((resolve,reject) => {
                slack.webhook(ret, (err,res) => { resolve(res) })
            })
        )
        .then(data => {
            console.log(data);
            callback(null, data);
        })
        .catch(err => {
            console.log("error happen.");
            console.log(err);
            context.fail(err);
        })
};

module.exports.sender = (event, context, callback) => {
    console.log(event);
    callback(null, event);
};
