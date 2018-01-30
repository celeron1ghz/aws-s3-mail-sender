# aws-s3-mail-sender
If you put a mail contents to s3, send itvia AWS SES.


## DESCRIPTION
This script creates `s3-mail-sender-queue`.

Put a email to that bucket, send this file as a email!

If sending is success, bucket's file is deleted. otherwise not deleted.

Delivery status are notify to slack.


### This script **DO**:
 * Sending email via Amazon Simple Email Service
 * Notify email sending status to slack


### This script **DON'T**:
 * Creating email
 * Setup SES setting (setup manually yourself)


## SETUP ENVIRONMENT VARIABLES
Set these value to `EC2 Parameter Store`.

 * `/s3mail/slack` Slack's Incoming Webhook URL


## SETUP SERVERLESS SCRIPT
```
git clone https://github.com/celeron1ghz/aws-s3-mail-sender.git
cd aws-s3-mail-sender
sls deploy
```


## SEE ALSO
 * https://aws.amazon.com/jp/ses/
