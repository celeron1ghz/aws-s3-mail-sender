zip: lambda_bounce_notifier/bounce_notifier.zip lambda_mail_sender/mail_sender.zip

lambda_bounce_notifier/bounce_notifier.js: lambda_bounce_notifier/bounce_notifier.js.sample
	cd lambda_bounce_notifier; \
	cat bounce_notifier.js.sample \
		| sed -e "s|<SLACK_HOOK_URL>|${SLACK_HOOK_URL}|" \
		| sed -e "s|<SLACK_CHANNEL>|${SLACK_CHANNEL}|" \
			> bounce_notifier.js;

lambda_bounce_notifier/bounce_notifier.zip: lambda_bounce_notifier/bounce_notifier.js
	cd lambda_bounce_notifier; zip bounce_notifier.zip bounce_notifier.js

lambda_mail_sender/mail_sender.zip: lambda_mail_sender/mail_sender.js
	cd lambda_mail_sender; zip mail_sender.zip mail_sender.js

clean:
	rm lambda_mail_sender/mail_sender.zip
	rm lambda_bounce_notifier/bounce_notifier.js
	rm lambda_bounce_notifier/bounce_notifier.zip
