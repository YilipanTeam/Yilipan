# 新結果処理システムCDK構築手順

## 前提
    * CDKデプロイはCloud9上で実施。
    * SNS及びWAFはCDKデプロイ前に手動設定。
    * Logアカウント側のログ集約用バケットはCDKデプロイ前に作成。
    * Logアカウント側のDataSync設定(クロスアカウントログレプリケーション設定)はCDKデプロイ後に実施。

## 注意
    * 本手順内のパラメータは開発環境へのデプロイを想定しているため、環境に応じてパラメータを読み替えること。
    * 下記リソースはコード化対象外の為、手動設定。
    　* SNS
    　* WAF
    　* Cloud9(VPC含む)
    　* ACM
    　* GuardDuty 
    　* Inspector
    　* Aurora(DBインスタンスのメンテナンスウィンドウのみ)
      * ECR(脆弱性スキャン設定のみ)

## 準備
1. CDK、Nodejs等のインストール
2. cdk bootstrapの実行(リージョンにつき、一度実施の必要あり)
    * `cdk bootstrap `

## ログ集約用バケット作成
   * ログアカウント側作業
1. BoxにあるLogアカウント用CFnテンプレートをダウンロード。
    * https://ctcbox-s.box.com/s/dnidkzeyr1jyghx3iwyaxu1nqdxtp9yh
2. LogアカウントのAWSマネジメントコンソールにログインする。
3. CloudFormationスタックを作成及び実行。   
   1. dev-wcc-wccLogArchive.template.jsonを実行

## リソース手動作成①
1. 以下のリソースを手動作成
    * SNS
    * WAF
    ※接続許可IPとしてNAT GWのIPを設定する必要があるが、このタイミングではIPが不明なためCDKデプロイ後に追加設定。

## CDK デプロイ
   * システムアカウント側作業
1. CDKコードをGitからClone
　 ※後述のGIT デプロイキーの設定を実施してあること。
     * `git clone git@github.com:7jm8oz6dq2ve/ds-iac-ctc.git`
  
2. npm インストール
    * `npm i`
    * `npm i --dev `

3. CDKパラメータ記入
    * cdk.json の該当環境の下記にパラメータ反映
        * snsAlarmTopicArn
            * sns topicArn を記入
        * cloudFrontWebAclId
            * WAF IDを記入
        * cloudFrontAcmArn
            * CloudFront用ACMパブリック証明書のARNを記入
        * albAcmArn
            * ALB用ACMパブリック証明書のARNを記入

4. スナップショットテスト
   1. 差分確認  
        `npm run test:dev`
   2. 問題なければスナップショット更新  
        `npm run test:dev -- -u ` 

5. cdk deploy  
   1. 差分確認
    * `cdk diff -c env=dev`
   2. デプロイ
    * `cdk deploy --all -c env=dev`  
   ※ECRにコンテナが存在しない場合BuckendStackが終了しないため、BuckendStack実行前に事前にECRへのPushが必要。  
   　(手順は[テスト手順](/doc/test-infrastructure.md)を参照。)

## リソース手動作成②
1. 以下のリソースを手動作成
    * WAF(接続許可IPにNAT GWのIPを追加)
    * GuardDuty 
    * Inspector
    * Aurora(DBインスタンスのメンテナンスウィンドウのみ)
    * ECR(脆弱性スキャン設定のみ)

## ログ集約用DataSync設定
   * ログアカウント側作業
1. BoxにあるLogアカウント用CFnテンプレートをダウンロード。
    * https://ctcbox-s.box.com/s/zsoacvp6a417brhghfkxty3fvvn8x6se
2. LogアカウントのAWSマネジメントコンソールにログインする。
3. CloudFormationスタックを作成及び実行。   
   1. dev-wcc-wccDatasync.template.jsonを実行

## （参考）DataSyncポリシーの作成　※原則対応不要。
1. 以下を参考にLogアカウント側でDataSyncポリシーを作成する。
　　https://aws.amazon.com/jp/premiumsupport/knowledge-center/datasync-missing-cloudwatch-logs/
　※"datasync-policy.json"はBoxの以下のフォルダに配置。
　　https://ctcbox.ent.box.com/folder/196488068088?s=z2msnpmjumzgvrx7fxmn473ab4t3xsmh

## （参考）GitHub デプロイキー設定手順
* 参考
    https://docs.github.com/ja/developers/overview/managing-deploy-keys#deploy-keys
1. ssh keygen
    ```
    ssh-keygen -t ed25519 -C "GIT Hubアカウントのメールアドレス"
    ```
1. 公開鍵をgithubにアップする
1. ssh configを修正
    * `~/.ssh/config`
        ```
        Host github.com-ds-iac-ctc
            Hostname github.com
            IdentityFile=/home/ec2-user/.ssh/id_ed25519
        ```

1. git clone
    ```
    git clone git@github.com-ds-iac-ctc:7jm8oz6dq2ve/ds-iac-ctc
    ```

