const exec = require('child_process').execSync;
const kms = key => exec(`credstash -r ap-northeast-1 get ${key}`).toString();

module.exports.kms = () => {
    return {
        S3_MAIL_SENDER_SLACK_HOOK_URL: kms('S3_MAIL_SENDER_SLACK_HOOK_URL'),
        S3_MAIL_SENDER_SLACK_CHANNEL:  kms('S3_MAIL_SENDER_SLACK_CHANNEL'),
    }   
};
