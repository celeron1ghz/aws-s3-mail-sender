const exec = require('child_process').execSync;
const kms = key => exec(`aws ssm get-parameter --name ${key} --with-decryption --query 'Parameter.Value' --output text`).toString();

module.exports.kms = () => {
    return {
        S3_MAIL_SENDER_SLACK_HOOK_URL: kms('/s3mail/slack'),
    }   
};
