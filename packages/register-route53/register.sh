#!/bin/bash

IP=$(curl -s -4 ipconfig.io/ip)
JSON=$(cat <<-END
  {
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "${DNS_DOMAIN_NAME}",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [
            {
              "Value": "${IP}"
            }
          ]
        }
      }
    ]
  }
END
)

aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch "$JSON"

IP=$(curl -s -6 ipconfig.io/ip)
JSON=$(cat <<-END
  {
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "${DNS_DOMAIN_NAME}",
          "Type": "AAAA",
          "TTL": 60,
          "ResourceRecords": [
            {
              "Value": "${IP}"
            }
          ]
        }
      }
    ]
  }
END
)

aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch "$JSON"
