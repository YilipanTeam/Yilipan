import * as cdk from 'aws-cdk-lib';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../../utils/commonTypes';
import { ResourceNameBuilder } from '../../../utils/helpers';

/**
 * RdsAuroraMysqlConstruct のプロパティ
 */
type Ec2InstanceConstructProps = {
    namingStackProps: NamingStackProps;
    vpc: ec2.IVpc;
    privateSubnets: ec2.ISubnet[];
    pubilicSubnets: ec2.ISubnet[];
    instanceType?: string;
    securityGroupName?: string;
    logGroupName?: string;
    cdkAutoRemove?: boolean;
}

/**
 * RDS Aurora MySQL Cluster 作成
 */
export class Ec2InstanceConstruct extends Construct {
    /**
     * RDS シークレット
     */
    readonly instance: ec2.Instance;
    readonly InstaceType?: string;
    readonly ec2Logs: { [logType: string]: logs.ILogGroup };

    constructor(scope: Construct, id: string, props: Ec2InstanceConstructProps) {
        super(scope, id);
        //定数
        const dbPort = 3306;
        this.InstaceType = props.instanceType || 't3.medium';
        const cloudwatchLogsExportsList = ['error', 'general', 'slowquery', 'audit'];

        // EC2 SecurityGroup
        const sg = new ec2.SecurityGroup(this, 'sg-ec2-bastion', {
            vpc: props.vpc,
            securityGroupName: props.securityGroupName,
            allowAllOutbound: true,
        });
        props.privateSubnets.forEach(v_ => {
            sg.addIngressRule(ec2.Peer.ipv4(v_.ipv4CidrBlock), ec2.Port.tcp(dbPort), 'allow MySql port access.',);
        });
        if (props.securityGroupName) {
            cdk.Tags.of(sg).add('Name', props.securityGroupName);
        }
        // EC2 Instance#1
       const instanceName1 = ResourceNameBuilder.makeResourceNameStr({
            serviceName: 'ec2',
            use: 'bastion',
            ...props.namingStackProps
        }); 
        
        this.instance = new ec2.Instance(this, 'EC2-Instance1', {
         vpc: props.vpc,
         vpcSubnets: { subnets: props.privateSubnets },
         instanceType: new ec2.InstanceType(this.InstaceType || 't3.medium'),
         machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
         instanceName: instanceName1,
         securityGroup:sg,
         blockDevices: [{
           deviceName: `/dev/xvda`,
           volume: ec2.BlockDeviceVolume.ebs(8, {
           encrypted: true,
           volumeType: ec2.EbsDeviceVolumeType.GP3,
           iops: 3000,
                   }),
                }]
            }
        );
        this.instance.userData.addCommands(
            `hostnamectl set-hostname ${instanceName1}`,
            'echo "preserve_hostname: true" >> /etc/cloud/cloud.cfg',
            'timedatectl set-timezone Asia/Tokyo',
            'yum update -y',
            'yum install -y amazon-cloudwatch-agent',
            'systemctl start amazon-cloudwatch-agent',
            'systemctl enable amazon-cloudwatch-agent'
            );    
         
        // ec2ロググループコンストラクト生成    
        this.ec2Logs = {};
        cloudwatchLogsExportsList.forEach(v_ => {
            const logs_ = logs.LogGroup.fromLogGroupName(this, `${v_}Log`, `/aws/ec2/instance/${this.instance.instanceId}/${v_}`);
            this.ec2Logs[v_] = logs_;
            logs_.node.addDependency(this.instance);
        });    
        
        }

    /**
     * CPUアラームを追加
     * @param id
     * @param alarmTopic 通知するSNSトピック
     * @param thresholdRate CPU使用率のアラート閾値
     * @param alarmName アラーム名
     */
    addCpuArarm(id: string, alarmTopic: sns.ITopic, thresholdRate = 0.8, alarmName?: string) {
    const alarm = new cw.Alarm(this, id, {
        metric: new cw.Metric({
            namespace: 'AWS/EC2',
            metricName: 'CPUUtilization',
            dimensionsMap: {
                InstanceId: this.instance.instanceId,
            },
            period: cdk.Duration.minutes(5),
            statistic: cw.Statistic.AVERAGE,
        }),
        evaluationPeriods: 5,
        datapointsToAlarm: 1,
        threshold: thresholdRate * 100,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
        treatMissingData: cw.TreatMissingData.BREACHING,
        alarmName,
    });
    if (alarmName) {
        cdk.Tags.of(alarm).add('Name', alarmName);
    }
    alarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
}
    /**
     * 空きメモリ使用率アラームを追加
     * @param id
     * @param alarmTopic 通知するSNSトピック
     * @param memorySize メモリサイズ
     * @param thresholdRate 空きメモリ使用率のアラート閾値
     * @param alarmName アラーム名
     */
    addMemoryArarm(id: string, alarmTopic: sns.ITopic, memorySize: number, thresholdRate = 0.2, alarmName?: string) {
        const alarm = new cw.Alarm(this, id, {
            metric: new cw.Metric({
                namespace: 'CWAgent',
                metricName: 'mem_used_percent',
            dimensionsMap: {
                 InstanceId: this.instance.instanceId,
                },
            period: cdk.Duration.minutes(5),
            statistic: cw.Statistic.AVERAGE,
        }),
        evaluationPeriods: 5,
        datapointsToAlarm: 1,
        threshold: memorySize * thresholdRate,
        comparisonOperator: cw.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
        treatMissingData: cw.TreatMissingData.BREACHING,
        alarmName,
    });
    if (alarmName) {
        cdk.Tags.of(alarm).add('Name', alarmName);
    }
    alarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
}}



    

