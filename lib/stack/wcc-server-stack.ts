import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2InstanceConstruct } from '../construct/ec2/ec2-construct';
import { NamingStackProps } from '../../utils/commonTypes';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import { VpcConstruct } from '../construct/vpc/vpc-construct';
import { AlbConstruct } from '../construct/alb/alb-construct'; 
import { InstanceTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';


/**
 * EC2 Instance Stack properties
 */
type WccServerStackProps = {
  namingStackProps: NamingStackProps;
  vpc: VpcConstruct;
  privateSubnets: ec2.ISubnet[];
  alb: AlbConstruct; 
  instanceType?: string;
  securityGroupName?: string;
  logGroupName?: string;
  snsAlarmTopicArn?: string;
} & cdk.StackProps;

/**
 * EC2 Instance Stack
 */
export class WccServerstack extends cdk.Stack {
  readonly ec2InstanceConstruct: Ec2InstanceConstruct;

  constructor(scope: Construct, id: string, props: WccServerStackProps) {
    super(scope, id, props);

    this.ec2InstanceConstruct = new Ec2InstanceConstruct(this, 'EC2-Instance-Construct', {
      namingStackProps: props.namingStackProps,
      vpc: props.vpc.vpc,
      privateSubnets: props.vpc.privateSubnets,
      publicSubnets: props.vpc.publicSubnets,
    
      instanceType: props.instanceType,
      securityGroupName: props.securityGroupName,
      logGroupName: props.logGroupName,
      cdkAutoRemove: true,
    });
    // 将EC2实例添加到目标组
    const loadBalancerTarget = new InstanceTarget(this.ec2InstanceConstruct.instance);
    props.alb.targetGroup.addTarget(loadBalancerTarget);
    
    const loadBalancerTarget2 = new InstanceTarget(this.ec2InstanceConstruct.instance2); // 修改这里
    props.alb.targetGroup.addTarget(loadBalancerTarget2);
    // Set up CPU alarm
    if (props.snsAlarmTopicArn) {
      const topic = sns.Topic.fromTopicArn(this, 'SnsTopic', props.snsAlarmTopicArn);
      this.ec2InstanceConstruct.addCpuArarm('CpuUtilization', topic, 0.8);
      this.ec2InstanceConstruct.addMemoryAlarm('MemoryUtilization', topic, 0.8);
    }
    
  }
}
