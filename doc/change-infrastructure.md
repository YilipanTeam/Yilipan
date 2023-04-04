# 新結果処理システムCDK変更手順

## 前提
    * CDKデプロイはCloud9上で実施。

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

## CDK デプロイ
   * システムアカウント側作業
1. CDKコードをGitからClone
   * `git clone git@github.com:7jm8oz6dq2ve/ds-iac-ctc.git`

2. devブランチ作成
   * `git branch dev`
   * `git checkout dev`

3. npm インストール
    * `npm i`
    * `npm i --dev `

4. CDKコード修正
    * cdk.json の該当環境のパラメータを修正
    * /lib/construct 、/lib/stack配下のコードを修正

5. スナップショットテスト
   1. 差分確認  
        `npm run test:dev`
   2. 問題なければスナップショット更新  
        `npm run test:dev -- -u ` 

6. cdk deploy
   1. 差分確認
      `cdk diff -c env=dev`
   2. デプロイ
      `cdk deploy dev-wcc-network dev-wcc-appStatefull dev-wcc-appConnection dev-wcc-appBackend -c env=dev`
      * dev-wcc-opsを含めると踏み台サーバが再作成されるため、必要なければ更新対象から除外
      * 該当するStackのみを指定して更新することも可能

7. stgブランチ作成＆検証環境にデプロイ

8. mainブランチにマージ＆本番環境にデプロイ

## ログ集約の設定に変更があった場合
   * ログアカウント側作業実施

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

