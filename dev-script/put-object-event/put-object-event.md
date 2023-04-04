# アップロードバケットにファイルを置いた際のバッチ起動テスト

### s3command
* put
    ``` sh
    aws s3 cp dummy1.txt s3://wcc1-s3-ps-ctc1-uploaded-checkup-result-files-01/
    aws s3 cp dummy1.txt s3://wcc1-s3-ps-ctc1-master-files-01/

    ```

* delete
    ``` sh
    aws s3 rm s3://wcc1-s3-ps-ctc1-uploaded-checkup-result-files-01/dummy1.txt
    aws s3 rm s3://wcc1-s3-ps-ctc1-master-files-01/dummy1.txt

    ```
* バケット削除
    ``` sh
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-uploaded-checkup-result-files-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-master-files-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-canary-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-frontend-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-lems-alb-accesslog-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-log-vpcflowlog-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-s3-accesslog-01
    aws s3 rb --force s3://wcc1-s3-ps-ctc1-app-cwl-backup-01

    ```