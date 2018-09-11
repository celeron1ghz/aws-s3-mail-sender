'use strict';

const METHODS = {
  Bounce: e => {
    let b = e.bounce;
    let m = e.mail;
    return {
      text: '*BOUNCE MAIL DETECTED!!!!!*',
      icon_emoji: ':warning:',
      attachments: [
        { color: 'warning', title: "Bounce Type", text: b.bounceType + ' / ' + b.bounceSubType, },
        { color: 'warning', title: "ID", text: m.messageId, },
        { color: 'warning', title: "From Address", text: m.source, },
        { color: 'warning', title: "To Address", text: m.destination.toString(), },
        { color: 'warning', title: "Send At", text: m.timestamp, },
      ],
    }
  },
  Complaint: e => {
    let c = e.complaint;
    let m = e.mail;
    return {
      text: '*COMPLAINT MAIL DETECTED!!!!!*',
      icon_emoji: ':warning:',
      attachments: [
        { color: 'danger', title: "Complaint Type", text: c.complaintFeedbackType, },
        { color: 'danger', title: "ID", text: m.messageId, },
        { color: 'danger', title: "From Address", text: m.source, },
        { color: 'danger', title: "To Address", text: m.destination.toString(), },
        { color: 'danger', title: "Send At", text: m.timestamp, },
      ],
    };
  },
  Delivery: e => {
    let m = e.mail;
    return {
      text: '',
      attachments: [{
        mrkdwn_in: ['text'],
        color: 'good',
        title: 'Sending Mail Success',
        text: `From: ${m.source}` + "\n" + `To: [ ${m.destination.toString()} ]` + "\n"
      }],
    };
  },
};


module.exports.notifier = async (event, context, callback) => {
  const aws = require('aws-sdk');
  const e = JSON.parse(event.Records[0].Sns.Message);
  const type = e.notificationType;
  const param = METHODS[type]
    ? METHODS[type](e)
    : {
      text: type,
      attachments: [{
        color: 'danger',
        text:  'UNKNOWN',
        title: 'UNKNOWN',
      }],
    };

  try {
    const Slack = require('slack-node');
    const slack = new Slack();
    slack.setWebhook(process.env.S3_MAIL_SENDER_SLACK_WEBHOOK_URL);
    param.mrkdwn = true;

    const ret = await new Promise((resolve, reject) => {
      slack.webhook(param, (err, res) => {
        if (err) { reject(err) } else { resolve(res) }
      });
    });

    console.log(ret.status, ret.statusCode);
    callback(null, ret);
  } catch (err) {
    console.log("error happen:", err);
    callback(err);
  }
};

module.exports.sender = async (event, context, callback) => {
  const mess = JSON.parse(event.Records[0].Sns.Message);
  const bucket = mess.Records[0].s3.bucket.name;
  const key = decodeURIComponent(mess.Records[0].s3.object.key.replace(/\+/g, ' '));

  const aws = require('aws-sdk');
  const s3  = new aws.S3();
  const ses = new aws.SES();

  try {
    console.log("RECEIVED", key);
    const received = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    console.log("MAIL_SIZE", received.Body.toString().length);
    const mail = await ses.sendRawEmail({ RawMessage: { Data: received.Body.toString() } }).promise();
    console.log("MAIL_RESPONSE", mail);

    await s3.deleteObject({ Bucket: bucket, Key: key }).promise();

    callback(null, "OK");
  } catch (err) {
    console.log("error happen:", err);
    callback(err);
  }
};
