## cname CLIcommand

* 一覧
    ``` sh
     aws route53 list-hosted-zones

    ```

* レコード内容
    ``` sh
     aws route53 list-resource-record-sets --hosted-zone-id Z0175964147XUW6MN5CCJ

    ```

* レコード追加
    ``` sh
    aws route53 change-resource-record-sets --hosted-zone-id Z0175964147XUW6MN5CCJ --change-batch file://ctc1-create-cname.json
    ```