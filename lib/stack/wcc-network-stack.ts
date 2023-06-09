import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../utils/commonTypes';
import { ensureStr } from '../../utils/helpers';
import { ResourceNameBuilder } from '../../utils/helpers';
import { VpcConstruct, PrivateSubnetProps, PublicSubnetProps } from '../construct/vpc/vpc-construct';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { S3S3logBucketConstruct } from '../construct/s3/s3-s3log-bucket-construct';

type WccNetworkStackProps = {
  namingStackProps: NamingStackProps;
  vpcCidr: string;
  publicSubnetsInfo?: SubnetInfo[];
  privateSubnetsInfo?: SubnetInfo[];
  s3flowLogBucketArn?: string;
  /** datasync用IAMロール */
  dataSyncRoleArnList?: string[]
  /**
   * dataSyncクロスアカウントId
   * クロスアカウントでDatasyncする場合は必須
   */
  dataSyncCorssAccountId?: string
} & cdk.StackProps

type SubnetInfo = {
  subnetCidr: string;
  availabilityZone: string;
}

export class WccNetworkStack extends cdk.Stack {
  public readonly vpc: VpcConstruct;
  public readonly s3AccessLogBucket: S3S3logBucketConstruct;

  constructor(scope: Construct, id: string, props: WccNetworkStackProps) {
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

    // パブリックサブネットリスト
    const publicSubnetsList: PublicSubnetProps[] = [];
    props.publicSubnetsInfo?.forEach(v_ => {
      const azCode = ensureStr(v_, 'availabilityZone').slice(-1);
      publicSubnetsList.push({
        subnetCidr: v_.subnetCidr,
        availabilityZone: v_.availabilityZone,
        routeTableName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'rtb',
          use: `public-${azCode}`,
          ...props.namingStackProps
        }),
        subnetName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'subnet',
          use: `public-${azCode}`,
          ...props.namingStackProps
        }),
        eipName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'eip',
          use: `${azCode}`,
          ...props.namingStackProps
        }),
        natGatewayName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'nat',
          use: `${azCode}`,
          ...props.namingStackProps
        }),
      });
    });

    // プライベートサブネットリスト
    const privateSubnetsList: PrivateSubnetProps[] = [];
    props.privateSubnetsInfo?.forEach(v_ => {
      const azCode = ensureStr(v_, 'availabilityZone').slice(-1);
      privateSubnetsList.push({
        subnetCidr: v_.subnetCidr,
        availabilityZone: v_.availabilityZone,
        routeTableName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'rtb',
          use: `private-${azCode}`,
          ...props.namingStackProps
        }),
        subnetName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 'subnet',
          use: `private-${azCode}`,
          ...props.namingStackProps
        }),
      });
    });

    // VPC作成
    this.vpc = new VpcConstruct(this, 'PsVpc', {
      vpcCidr: props.vpcCidr,
      publicSubnets: publicSubnetsList,
      privateSubnets: privateSubnetsList,
      vpcName: ResourceNameBuilder.makeResourceNameStr({
        serviceName: 'vpc',
        use: 'apne1',
        ...props.namingStackProps
      }),
      igwName: ResourceNameBuilder.makeResourceNameStr({
        serviceName: 'igw',
        ...props.namingStackProps
      })
    });

    // S3フローログ作成
    if (props.s3flowLogBucketArn) {
      const s3flowLogBucketArn = s3.Bucket.fromBucketArn(this, 'AccessLogBucket', props.s3flowLogBucketArn);
      this.vpc.addS3FlowLog('S3FlowLog', {
        s3flowLogBucket: s3flowLogBucketArn,
        S3FlowLogName: ResourceNameBuilder.makeResourceNameStr({
          serviceName: 's3',
          use: 'log-vpcflowlog',
          ...props.namingStackProps
        })
      });
    }

    // S3Gatewayエンドポイント作成
    this.vpc.addS3GatewayEndpoint('S3GatewayEp');
    
    // EC2MessagesInterfaceエンドポイント作成
    this.vpc.addEc2MessagesInterfaceEndpoint('Ec2MessagesInterfaceEp');
    
    // SSMInterfaceEndpointエンドポイント作成
    this.vpc.addSsmInterfaceEndpoint('SsmInterfaceEp');
    
    // SSMMessagesInterfaceEndpointエンドポイント作成
    this.vpc.addSsmMessagesInterfaceEndpoint('SsmMessagesInterfaceEp');
  }
}