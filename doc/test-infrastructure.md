# 新結果処理システム構築後テスト手順

## 前提
    * Cloud9上で実施。
    * CDKによる環境初回構築後のテストとして実施。

## 注意
    * 本テスト手順内のパラメータは開発環境を想定しているため、環境に応じてパラメータを読み替えること

## 準備
1. コードをダウンロード
    * cdk   
        ※後述のGIT デプロイキーの設定を実施してあること。
        * `git clone git@github.com:7jm8oz6dq2ve/ds-iac-ctc.git`
    * テストコード
    　　`aws s3 cp s3://ctc-temp-testfiles/testmock/ . --recursive | tee /home/ec2-user/logs/yyyymmdd.txt`
　　　　※事前にS3バケットを作成し、Boxの下記フォルダからテストコードを作成したS3バケットにアップロードする。
　　　　https://ctcbox.ent.box.com/folder/196468663617?s=fa2kglbum3qyu4o85hmezfht5djwstc6

1. テストコードをインストール
    * `tar -zxvf batch.tar.gz`
    * `unzip ts-express-test-wcc-dev.zip`
    * `unzip vue-test-dev-wcc.zip`

## テストデータ準備
### フロントアプリデプロイ
1. endpoint 修正
    * `.env.production` の下記部分修正
        * `VUE_APP_API_ENDPOINT=https://ps-dev.wellcoms.jp`
1. npm インストール
    * `npm i`
    * `npm i --dev`
1. build
    * `npm run prod-build`
1. deploy
    * `aws s3 sync ./dist s3://wcc-s3-ps-dev-web-01/`

### バックエンドアプリデプロイ
1. npm インストール
    * `npm i`
    * `npm i --dev`
1. build
    * `npm run build`
1. docker build & push
    アカウントID リポジトリ等は適宜修正
    ``` sh
    aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com

    sudo docker build -t wcc-ecr-ps-dev-lems-01 . 

    docker tag wcc-ecr-ps-dev-lems-01:latest 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-lems-01:latest

    docker push 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-lems-01:latest
    ```

### バッチアプリデプロイ
1. パラメータ修正
 　※batch.tar.gz: src/app.ts 内にaxiosでAPIをコールしている箇所があるため、下記baseURLをフロントのエンドポイントに修正してビルド。
  　　const axios = axiosBase.create({
       baseURL: 'https://ps-dev.wellcoms.jp', 
1. npm インストール
    * `npm i`
    * `npm i --dev`
1. build
    * `npm run build`
1. docker build & push
    アカウントID リポジトリ等は適宜修正
    ``` sh
    aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com
    
    sudo docker build -t wcc-ecr-ps-dev-crcb-01 . 

    docker tag wcc-ecr-ps-dev-crcb-01:latest 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-crcb-01:latest
    docker tag wcc-ecr-ps-dev-crcb-01:latest 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-mub-01:latest

    docker push 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-crcb-01:latest
    docker push 048262783971.dkr.ecr.ap-northeast-1.amazonaws.com/wcc-ecr-ps-dev-mub-01:latest
    ```

### テストデータ作成
1. テストテーブル作成
    1. 踏み台サーバにログイン

    1. MySQL接続
        * secret （環境変数）
            ``` sh
            secret=$(aws secretsmanager get-secret-value --secret-id wcc-sm-ps-dev-aurora-01 --region ap-northeast-1 | jq .SecretString | jq fromjson)
            user=$(echo $secret | jq -r .username)
            password=$(echo $secret | jq -r .password)
            endpoint=$(echo $secret | jq -r .host)
            port=$(echo $secret | jq -r .port)
            ```
        * 接続
            ``` sql 
            mysql --host=$endpoint --user=auroramysql --password=$password
            ```
    1. SQL実行
        ```sql
        CREATE DATABASE test;
        CREATE TABLE IF NOT EXISTS test.users
        (
            user_id varchar(50), 
            user_name varchar(50),
            primary key (user_id)
        );

        insert into test.users values ('dbTest1', 'DB TEST 1');
        insert into test.users values ('dbTest2', 'DB TEST 2');

        select * from test.users;
        ```

### テスト実行
    1. フロントエンドへのアクセス
        * ブラウザで下記アクセス
            * https://ps-dev.wellcoms.jp
    1. バックエンドへのアクセス
        * ブラウザで下記アクセス
            * https://ps-dev-org.wellcoms.jp
    1. バッチ実行確認
        * ダミーデータ作成
            ` touch dummy1.txt`
        * put
            ``` sh
            aws s3 cp dummy1.txt s3://wcc-s3-ps-dev-uploaded-checkup-result-files-01/
            aws s3 cp dummy1.txt s3://wcc-s3-ps-dev-master-files-01/

            ```

        * delete
            ``` sh
            aws s3 rm s3://wcc-s3-ps-dev-uploaded-checkup-result-files-01/dummy1.txt
            aws s3 rm s3://wcc-s3-ps-dev-master-files-01/dummy1.txt
            ```

### テストデータクリーンアップ
1. ECR上のdocker image 削除
1. S3上のフロントアプリ削除
1. RDS 内の test database 削除
        1. SQL実行
        ```sh
        DROP DATABASE IF EXISTS test;
        ```

## (参考) MySQL クライアントインストール
* 前提
    * Amazon linux2 で確認
* 手順
    ``` sh
    yum list installed | grep mariadb
    sudo yum remove mariadb-libs
    sudo yum localinstall -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm
    sudo yum-config-manager --disable mysql57-community
    sudo yum-config-manager --enable mysql80-community
    sudo yum install -y mysql-community-client
    mysql --version
    ```
* 参考
    * https://qiita.com/tamorieeeen/items/d9b2af588f1dfd43120d
* GPGエラーが出る場合
    * `sudo rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022`
    * https://blog.katsubemakito.net/mysql/mysql-update-error-gpg

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
