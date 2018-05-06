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
        text: `From = ${m.source}` + "\n" +
          `To = [ ${m.destination.toString()} ]` + "\n" +
          `ID = ${m.messageId}` + "\n" +
          `SendAt = ${m.timestamp}`,
      }],
    };
  },
};


module.exports.notifier = async (event, context, callback) => {
  const e = JSON.parse(event.Records[0].Sns.Message);
  const type = e.notificationType;
  let ret;

  const aws = require('aws-sdk');

  if (METHODS[type]) {
    ret = METHODS[type](e);
  } else {
    ret = {
      text: type,
      attachments: [{
        color: 'danger',
        text:  'UNKNOWN',
        title: 'UNKNOWN',
      }],
    };
  }

  try {
    const Slack = require('slack-node');
    const slack = new Slack();
    slack.setWebhook(process.env.S3_MAIL_SENDER_SLACK_WEBHOOK_URL);
    ret.mrkdwn = true;

    const slack_ret = await new Promise((resolve, reject) => {
      slack.webhook(ret, (err, res) => {
        if (err) { reject(err) } else { resolve(res) }
      });
    });

    console.log(slack_ret);
    callback(null, slack_ret);
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
    console.log(`S3.getObject(${bucket}#${key})`);
    const received = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    console.log(`SES.sendRawEmail(${received.Body.toString().length})`);
    const mail = await ses.sendRawEmail({ RawMessage: { Data: received.Body.toString() } }).promise();

    console.log(" ==> ", mail);
    console.log(`S3.deleteObject(${bucket}#${key})`);
    const deleted = await s3.deleteObject({ Bucket: bucket, Key: key }).promise();

    console.log(" ==> ", deleted);
    callback(null, "OK");
  } catch (err) {
    console.log("error happen:", err);
    callback(err);
  }
};
