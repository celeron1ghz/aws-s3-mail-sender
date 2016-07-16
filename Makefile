zip: lambda_bounce_notifier/bounce_notifier.zip lambda_mail_sender/mail_sender.zip

lambda_bounce_notifier/bounce_notifier.zip: lambda_bounce_notifier/acceptessa_mail_bounce_notifier.js
	zip bounce_notifier.zip acceptessa_mail_bounce_notifier.js

lambda_bounce_notifier/acceptessa_mail_bounce_notifier.js: lambda_bounce_notifier/acceptessa_mail_bounce_notifier.js.sample
	cd lambda_bounce_notifier; \
	cat acceptessa_mail_bounce_notifier.js.sample \
		| sed -e "s|<SLACK_HOOK_URL>|${SLACK_HOOK_URL}|" \
		| sed -e "s|<SLACK_CHANNEL>|${SLACK_CHANNEL}|" \
			> acceptessa_mail_bounce_notifier.js;

lambda_mail_sender/mail_sender.zip: lambda_mail_sender/acceptesa_mail_sender.js
	cd lambda_mail_sender; zip mail_sender.zip acceptesa_mail_sender.js
