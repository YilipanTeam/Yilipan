import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../utils/commonTypes';
import { ResourceNameBuilder } from '../../utils/helpers';
import { S3S3logBucketConstruct } from '../construct/s3/s3-s3log-bucket-construct';
import { S3FileBucketConstruct } from '../construct/s3/s3-file-bucket-construct';



type WccStorageStackProps = {
  namingStackProps: NamingStackProps;
  /** datasync用IAMロール */
  dataSyncRoleArnList?: string[]
  s3AccessLogBucket?: S3S3logBucketConstruct;
  /**
   * dataSyncクロスアカウントId
   * クロスアカウントでDatasyncする場合は必須
   */
  dataSyncCorssAccountId?: string
} & cdk.StackProps


export class WccStorageStack extends cdk.Stack {
  public readonly s3AccessLogBucket: S3S3logBucketConstruct;
  public readonly s3FileBucket: S3S3logBucketConstruct;
  
  constructor(scope: Construct, id: string, props: WccStorageStackProps) {
    super(scope, id, props);

    // S3アクセスログ格納用バケット作成
    this.s3AccessLogBucket = new S3S3logBucketConstruct(this, 'S3LogBucket', {
      bucketName: ResourceNameBuilder.makeResourceNameStr({
        serviceName: 's3',
        use: 's3-accesslog',
        ...props.namingStackProps
      }),
      deleteObjectsLifeCyclePolicy: {
        expirationDays: 7,
        lifecycleName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'lifecycle',
          use: 'accesslog',
          ...props.namingStackProps
        })
      },
      dataSyncRoleArnList: props.dataSyncRoleArnList,
      dataSyncCorssAccountId: props.dataSyncCorssAccountId,
      serverAccessLogSourceAccountId: props.env?.account,
      cdkAutoRemove: /^ctc[0-9]$/.test(props.namingStackProps.envKey) || false,
    })
    
    
      // S3アクセスログ格納用バケット作成
    this.s3FileBucket = new S3FileBucketConstruct(this, 'S3FileBucket', {
      bucketName: ResourceNameBuilder.makeResourceNameStr({
        serviceName: 's3',
        use: 's3-fileg',
        ...props.namingStackProps
      }),
      deleteObjectsLifeCyclePolicy: {
        expirationDays: 7,
        lifecycleName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'lifecycle',
          use: 'accesslog',
          ...props.namingStackProps
        })
      },
      cdkAutoRemove: /^ctc[0-9]$/.test(props.namingStackProps.envKey) || false,
      serverAccessLogsBucket: props.s3AccessLogBucket?.s3Bucket,
    })
  }
}