## 何をするもの？
s3をメールのqueueとしてSESのメール送信を行うものです。

```
MIME形式のテキストをs3のバケットに上げる（自分で実装する）
↓
s3の`ObjectCreate`フックが発火してlambdaを起動
↓
lambdaがSESを使ってメール送信
↓
送信できたらテキストファイルはs3から削除する
```

メールをMIME形式で作成しs3のバケットにアップロードするまでは **自分で行う必要** があります。
このアプリケーションが行うのはメールの送信、およびバウンスのハンドリングのみです。

MIME形式のメールを作成するには各言語のライブラリを使用して作成してください。
Perlだと[Email::MIME](http://search.cpan.org/~rjbs/Email-MIME/)などがあります。


## 設定
下記についてはterraformの構築内容に含まれていないので各自で行ってください。


#### メールのドメイン設定
下記の設定を行ってください。

（とは言ってもだいたいワンクリックで終わるようになっているのでどうということはない）

 * route53でのドメイン取得とnameserverの設定
 * SESへのドメイン登録・ドメイン確認
 * SPF、DKIMの設定
 * SESのsandbox解除申請
 * バウンスの管理のためのSNS topic設定（後述）


#### Slackの設定
バウンスの通知にSlackを利用しています。
`credstash` で下記のキーと対応する値をセットしてください。

 * `S3_MAIL_SENDER_SLACK_HOOK_URL` SlackのIncoming Webhook URL
 * `S3_MAIL_SENDER_SLACK_CHANNEL` Slackのpostするチャンネル


## 構築
serverlessで作っているので `sls deploy` で完了です。
