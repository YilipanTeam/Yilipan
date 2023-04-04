
## mysql Client Install

### 前提
Amazon Linux2を利用

### インストール
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

### mySQL 操作
* secret （環境変数）
    ``` sh
    secret=$(aws secretsmanager get-secret-value --secret-id wcc1-sm-ps-ctc1-aurora-01 --region us-west-2 | jq .SecretString | jq fromjson)
    user=$(echo $secret | jq -r .username)
    password=$(echo $secret | jq -r .password)
    endpoint=$(echo $secret | jq -r .host)
    port=$(echo $secret | jq -r .port)
    ```
* 接続
    ``` sql 
    mysql --host=$endpoint --user=auroramysql --password=$password
    ```
* Create Database
    ``` sql
        CREATE DATABASE test;
    ```
* db プロビジョニング
    ``` sql
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