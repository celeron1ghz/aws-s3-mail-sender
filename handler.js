'use strict';

const METHODS = {
  Bounce: e => {
    const b = e.bounce;
    const m = e.mail;
    return {
      icon_emoji: ':warning:',
      attachments: [{
        mrkdwn_in: ['text'],
        color: 'danger',
        title: '!!!!! BOUNCE MAIL DETECTED !!!!!',
        text: [
          "*Reason: " + b.bounceType + ' / ' + b.bounceSubType + "*",
          "From: "   + m.source,
          "To: "     + m.destination.join(", "),
        ].join("\n"),
      }],
    }
  },
  Complaint: e => {
    const c = e.complaint;
    const m = e.mail;
    return {
      text: '',
      icon_emoji: ':warning:',
      attachments: [{
        mrkdwn_in: ['text'],
        color: 'danger',
        title: '!!!!! COMPLAINT MAIL DETECTED !!!!!',
        text: [
          "*Reason: " +  c.complaintFeedbackType + "*",
          "From: "   + m.source,
          "To: "     + m.destination.join(", "),
        ].join("\n"),
      }],
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
        text: [
          "From: " + m.source,
          "To: " +  m.destination.join(", "),
        ].join("\n"),
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

    if (received.Metadata.circle)  {
        await s3.putObject({
          Bucket: process.env.RESULT_BUCKET,
          Key: mail.MessageId,
          Body: received.Metadata.circle,
        }).promise().catch(err => console.log("Error on put metadata:", err));
    }

    callback(null, "OK");
  } catch (err) {
    console.log("error happen:", err);
    callback(err);
  }
};
