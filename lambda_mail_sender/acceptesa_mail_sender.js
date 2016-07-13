'use strict';
console.log('Loading function');

let aws = require('aws-sdk');
let s3  = new aws.S3({ apiVersion: '2006-03-01' });
let ses = new aws.SES();

exports.handler = (event, context, callback) => {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = { Bucket: bucket, Key: key };
    
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            ses.sendRawEmail({
                RawMessage: {
                    Data: data.Body.toString()
                }
            }, function(err, data) {
                if (err)    {
                    console.log(err, err.stack);
                    callback(err);
                }
                else     {
                    console.log(data);
                    callback(null, data.ContentType);
                }
            });
        }
    });
};
