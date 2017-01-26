'use strict';
console.log('Loading function');

let aws = require('aws-sdk');
let s3  = new aws.S3({ apiVersion: '2006-03-01' });
let ses = new aws.SES();

exports.handler = (event, context, callback) => {
    const mess   = JSON.parse(event.Records[0].Sns.Message);
    const bucket = mess.Records[0].s3.bucket.name;
    const key    = decodeURIComponent(mess.Records[0].s3.object.key.replace(/\+/g, ' '));

    s3.getObject({ Bucket: bucket, Key: key }).promise()
        .then(data => {
            //console.log(data.Body.toString());
            return ses.sendRawEmail({ RawMessage: { Data: data.Body.toString() } }).promise();
        })
        .then(data => {
            console.log(data);
            console.log("mail send ok. try to delete...");
            return s3.deleteObject({ Bucket: bucket, Key: key }).promise();
        })
        .then(data => {
            console.log("delete successful.");
            callback(null, data);
        })
        .catch(err => {
            console.log(err);
            const message = `Object ${key} is not found in ${bucket}. Check file is exist or bucket is in the same region.`;
            console.log(message);
            callback(message);
        });
};
