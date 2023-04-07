import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ensureStr } from '../utils/helpers';
import { WccNetworkStack } from '../lib/stack/wcc-network-stack';
import { WccAppConnectionStack } from '../lib/stack/wcc-app-connection-stack';
import { WccServerstack } from '../lib/stack/wcc-server-stack';
import { WccStorageStack } from '../lib/stack/wcc-storage-stack';



const app = new cdk.App();

// ----------------------- Load context variables ------------------------------
const envKey: string = app.node.tryGetContext('env'); // 環境識別子

if (!envKey || envKey.length === 0) {
  throw new Error('Argument env is empty.');
}
const envVals = app.node.tryGetContext(envKey); // 環境パラメータ
const pjPrefix = ensureStr(envVals['common'], 'pjPrefix');
const region = ensureStr(envVals['common'], 'region');

// CDK デフォルトアカウント & リージョン
const procEnvDefault: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: region || process.env.CDK_DEFAULT_REGION,
};

// ネーミング要素
const namingStackProps = {
  envKey: envKey,
  pjPrefix: pjPrefix,
  systemId: 'ps',
}

//通知用SNS
const snsAlarmTopicArn = envVals['common']['snsAlarmTopicArn'] || undefined;

// dataSync用IAMロール
const dataSyncRoleArnList = envVals['common']['dataSyncRoleArnList'] || undefined;
// dataSync用クロスアカウント先ID
const dataSyncCorssAccountId = envVals['common']['dataSyncCorssAccountId'] || undefined;
// ----------------------- Environment variables for stack ------------------------------

// ネットワークリソースを作成
const networkStack = new WccNetworkStack(app, `${envKey}-${pjPrefix}-network`, {
  env: procEnvDefault,
  namingStackProps: { ...namingStackProps, increment: 1 },
  vpcCidr: ensureStr(envVals['network'], 'vpcCidr'),
  s3flowLogBucketArn: envVals['network']['s3flowLogBucketArn'] || undefined,
  publicSubnetsInfo: envVals['network']['publicSubnet'],
  privateSubnetsInfo: envVals['network']['privateSubnet'],
  dataSyncRoleArnList,
  dataSyncCorssAccountId,
});
cdk.Tags.of(networkStack).add('CTC_Bill02_System', `ps-${envKey}`);



// アプリケーション接続リソース（フロントエンド及びロードバランサー） を作成
const appConnectionStack = new WccAppConnectionStack(app, `${envKey}-${pjPrefix}-appConnection`, {
  env: procEnvDefault,
  namingStackProps: { ...namingStackProps, increment: 1 },
  albAcmArn: ensureStr(envVals['appConnection'], 'albAcmArn'),
  vpc: networkStack.vpc,
  albAccessLogbucketArn: envVals['appConnection']['albAccessLogbucketArn'] || undefined,
  snsAlarmTopicArn,
  s3AccessLogBucket: networkStack.s3AccessLogBucket,
  //domainName: 'yilipan.com',
  
  //domainName: 'yourDomainName', // 传入正确的 domainName
  //alb: wccappconnectionStack.alb, // 传入 alb 实例
  //nlb: nlb, // 传入 nlb 实例
  //route53: route53, // 传入 route53 实例
});
  cdk.Tags.of(appConnectionStack).add('CTC_Bill02_System', `ps-${envKey}`);


//運用リソースを作成
const serverStack = new WccServerstack(app, `${envKey}-${pjPrefix}-server`, {
  env: procEnvDefault,
  namingStackProps: { ...namingStackProps, increment: 1 },
  vpc: networkStack.vpc,
  alb: appConnectionStack.alb,
  privateSubnets: networkStack.vpc.privateSubnets || [],
});
cdk.Tags.of(serverStack).add('CTC_Bill02_System', `ps-${envKey}`);


// storageを作成
const storageStack = new WccStorageStack(app, `${envKey}-${pjPrefix}-storage`, {
  env: procEnvDefault,
  namingStackProps: { ...namingStackProps, increment: 1 },
});
cdk.Tags.of(storageStack).add('CTC_Bill02_System', `ps-${envKey}`);