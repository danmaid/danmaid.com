ipinfo.io/ip から外部 IP を取得し、 Route53 の A レコードを更新する。

env

- HOSTED_ZONE_ID: Route53 の対象ゾーンID
- DNS_DOMAIN_NAME: 更新対象レコード

## 前提

ECS Fargate のタスクを想定。

タスク定義

- 実行ロールとして Route53 の更新ポリシーを含むロールを割り当てる。
- 2 つ目のコンテナとして本コンテナを起動する。

更新ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": "route53:ChangeResourceRecordSets",
      "Resource": "arn:aws:route53:::hostedzone/対象ゾーンID",
      "Condition": {
        "ForAllValues:StringEquals": {
          "route53:ChangeResourceRecordSetsActions": "UPSERT",
          "route53:ChangeResourceRecordSetsNormalizedRecordNames": "更新対象レコード"
        }
      }
    }
  ]
}
```
