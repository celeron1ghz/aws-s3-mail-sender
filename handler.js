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


module.exports.notifier = (event, context, callback) => {
    const e    = JSON.parse(event.Records[0].Sns.Message);
    const type = e.notificationType;
    let ret;

    const aws = require('aws-sdk');
    const vo  = require('vo');
    const ssm = new aws.SSM({ region: 'ap-northeast-1' });

    if (METHODS[type])   {
        ret = METHODS[type](e);
    } else {
        ret = {
            text:        type,
            attachments: [{
                color: 'danger',
                text:  "UNKNOWN",
                title: "UNKNOWN",
            }],
        };
    }

    vo(function*(){
        const url   = (yield ssm.getParameter({ Name: '/s3mail/slack', WithDecryption: true }).promise() ).Parameter.Value;
        const Slack = require('slack-node');
        const slack = new Slack();
        slack.setWebhook(url);
        ret.mrkdwn  = true;

        const slack_ret = yield new Promise((resolve,reject) => {
            slack.webhook(ret, (err,res) => {
                if (err) { reject(err) } else { resolve(res) }
            });
        });

        console.log(" ==> ", slack_ret);
        callback(null, slack_ret);
    }).catch(err => {
        console.log("error happen:", err);
        callback(err);
    });
};

module.exports.sender = (event, context, callback) => {
    const mess   = JSON.parse(event.Records[0].Sns.Message);
    const bucket = mess.Records[0].s3.bucket.name;
    const key    = decodeURIComponent(mess.Records[0].s3.object.key.replace(/\+/g, ' '));

    const aws = require('aws-sdk');
    const s3  = new aws.S3();
    const ses = new aws.SES();

    console.log(`S3.getObject(${bucket}#${key})`);
    s3.getObject({ Bucket: bucket, Key: key }).promise()
        .then(data => {
            console.log(`SES.sendRawEmail(${data.Body.toString().length})`);
            return ses.sendRawEmail({ RawMessage: { Data: data.Body.toString() } }).promise();
        })
        .then(data => {
            console.log(" ==> ", data);
            console.log(`S3.deleteObject(${bucket}#${key})`);
            return s3.deleteObject({ Bucket: bucket, Key: key }).promise();
        })
        .then(data => {
            console.log(" ==> ", data);
            callback(null, data);
        })
        .catch(err => {
            console.log(" ERROR! ", err);
            callback(err);
        });
};
