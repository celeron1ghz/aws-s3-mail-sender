variable "app_name" { description = "application name" }


/* Email queue */
resource "aws_s3_bucket" "queue" {
    bucket = "${var.app_name}-mail-send-queue"
    acl = "private"
}

resource "aws_s3_bucket_notification" "queue_notification" {
    bucket = "${aws_s3_bucket.queue.id}"
    topic {
        topic_arn = "${aws_sns_topic.topic.arn}"
        events = ["s3:ObjectCreated:*"]
    }
}


/* lambda functions and role */
resource "aws_iam_role" "role" {
    name = "${var.app_name}-mail-send-sender-role"
    assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "policy" {
    name = "${var.app_name}-mail-send-policy"
    role = "${aws_iam_role.role.id}"
    policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": [
                "arn:aws:logs:*:*:*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendRawEmail"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
EOF
}

resource "aws_iam_policy_attachment" "s3_policy" {
    name = "${var.app_name}-mail-send-s3-policy"
    roles = ["${aws_iam_role.role.id}"]
    policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}


resource "aws_lambda_function" "mail_bounce_notifier" {
    filename         = "lambda_bounce_notifier/bounce_notifier.zip"
    function_name    = "${var.app_name}-mail-send-bounce-notifier"
    runtime          = "nodejs4.3"
    role             = "${aws_iam_role.role.arn}"
    handler          = "acceptessa_mail_bounce_notifier.handler"
    source_code_hash = "${base64sha256(file("lambda_bounce_notifier/bounce_notifier.zip"))}"
}

resource "aws_lambda_function" "mail_sender" {
    filename         = "lambda_mail_sender/mail_sender.zip"
    function_name    = "${var.app_name}-mail-send-sender"
    runtime          = "nodejs4.3"
    timeout          = "6"
    role             = "${aws_iam_role.role.arn}"
    handler          = "acceptesa_mail_sender.handler"
    source_code_hash = "${base64sha256(file("lambda_mail_sender/mail_sender.zip"))}"
}


/* Email handler topics for SES*/
resource "aws_sns_topic" "topic" {
    name = "${var.app_name}-mail-send-topic"
    policy = <<POLICY
{
    "Version":"2012-10-17",
    "Statement":[{
        "Effect": "Allow",
        "Principal": {"AWS":"*"},
        "Action": "SNS:Publish",
        "Resource": "arn:aws:sns:*:*:${var.app_name}-mail-send-topic",
        "Condition":{
            "ArnLike":{"aws:SourceArn":"${aws_s3_bucket.queue.arn}"}
        }
    }]
}
POLICY
}

resource "aws_sns_topic" "topic_delivery" {
    name = "${var.app_name}-mail-send-delivery-status"
}

resource "aws_sns_topic" "topic_complaint" {
    name = "${var.app_name}-mail-send-complaint"
}

resource "aws_sns_topic" "topic_bounce" {
    name = "${var.app_name}-mail-send-bounce"
}


/* subscription */
resource "aws_sns_topic_subscription" "subscription_send" {
    topic_arn = "${aws_sns_topic.topic.arn}"
    protocol  = "lambda"
    endpoint  = "${aws_lambda_function.mail_sender.arn}"
}

resource "aws_sns_topic_subscription" "subscription_delivery" {
    topic_arn = "${aws_sns_topic.topic_delivery.arn}"
    protocol  = "lambda"
    endpoint  = "${aws_lambda_function.mail_bounce_notifier.arn}"
}

resource "aws_sns_topic_subscription" "subscription_complaint" {
    topic_arn = "${aws_sns_topic.topic_complaint.arn}"
    protocol  = "lambda"
    endpoint  = "${aws_lambda_function.mail_bounce_notifier.arn}"
}

resource "aws_sns_topic_subscription" "subscription_bounce" {
    topic_arn = "${aws_sns_topic.topic_bounce.arn}"
    protocol  = "lambda"
    endpoint  = "${aws_lambda_function.mail_bounce_notifier.arn}"
}


/* Add running lambda function permission for SNS */
resource "aws_lambda_permission" "perm_send" {
    statement_id  = "${var.app_name}-mail-send-perm-send-from-sns"
    action        = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.mail_sender.arn}"
    principal     = "sns.amazonaws.com"
    source_arn    = "${aws_sns_topic.topic.arn}"
}

resource "aws_lambda_permission" "perm_delivery" {
    statement_id  = "${var.app_name}-mail-send-perm-delivery-notify-from-sns"
    action        = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.mail_bounce_notifier.arn}"
    principal     = "sns.amazonaws.com"
    source_arn    = "${aws_sns_topic.topic_delivery.arn}"
}

resource "aws_lambda_permission" "perm_complaint" {
    statement_id  = "${var.app_name}-mail-send-perm-complaint-notify-from-sns"
    action        = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.mail_bounce_notifier.arn}"
    principal     = "sns.amazonaws.com"
    source_arn    = "${aws_sns_topic.topic_complaint.arn}"
}

resource "aws_lambda_permission" "perm_bounce" {
    statement_id  = "${var.app_name}-mail-send-perm-bounce-notify-from-sns"
    action        = "lambda:InvokeFunction"
    function_name = "${aws_lambda_function.mail_bounce_notifier.arn}"
    principal     = "sns.amazonaws.com"
    source_arn    = "${aws_sns_topic.topic_bounce.arn}"
}
