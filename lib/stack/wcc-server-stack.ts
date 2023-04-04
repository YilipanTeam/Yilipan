import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../utils/commonTypes';
import { ResourceNameBuilder } from '../../utils/helpers';
import { EC2TerminationProtectionConstruct } from '../construct/ec2/ec2-construct';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AlbConstruct } from '../construct/alb/alb-construct';

type WccServerStackProps = {
    namingStackProps: NamingStackProps;
    vpc: ec2.IVpc;
    privateSubnets: ec2.ISubnet[];
    /**
     * EC2のインスタンスタイプ
     * @example t3.micro
     */
    alb: AlbConstruct;
    targetGroup: elb.IApplicationTargetGroup;
    instanceType?: string;
} & cdk.StackProps

export class WccServerStack extends cdk.Stack {
    public readonly bastionInstance: ec2.Instance;
    public readonly otherInstance: ec2.Instance;


    constructor(scope: Construct, id: string, props: WccServerStackProps) {
        super(scope, id, props);

        // Ec2 Security Group
        const sgName = ResourceNameBuilder.makeResourceNameStr({
            serviceName: 'sg',
            use: 'bastion',
            ...props.namingStackProps
        });
        const sg = new ec2.SecurityGroup(this, 'sg-ec2-bastion', {
            vpc: props.vpc,
            securityGroupName: sgName,
            allowAllOutbound: true
        });
        cdk.Tags.of(sg).add('Name', sgName);

        // Ec2 IAM Role
        const roleName = ResourceNameBuilder.makeResourceNameStr({
            serviceName: 'role',
            use: 'bastion',
            ...props.namingStackProps
        });
        const role = new iam.Role(this, 'role-ec2-bastion', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: 'bastion ec2 role',
            roleName: roleName,
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
        });
        cdk.Tags.of(role).add('Name', roleName);

        // EC2 Instance
        const instanceName = ResourceNameBuilder.makeResourceNameStr({
            serviceName: 'ec2',
            use: 'bastion',
            ...props.namingStackProps
        });
        const instance = new ec2.Instance(this, 'ec2-bastion',
            {
                vpc: props.vpc,
                vpcSubnets: { subnets: props.privateSubnets },
                instanceType: new ec2.InstanceType(props.instanceType || 't3.micro'),
                machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
                instanceName: instanceName,
                role: role,
                securityGroup: sg,
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
        instance.userData.addCommands(
            `hostnamectl set-hostname ${instanceName}`,
            'echo "preserve_hostname: true" >> /etc/cloud/cloud.cfg',
            'timedatectl set-timezone Asia/Tokyo',
            'yum update -y'
        );
        props.alb.addAlbTarget({
        port: 80, // 根据实际情况设置端口
        targets: [new targets.InstanceTarget(instance)],// 如果有的话
        healthCheckPath: '/', // 根据实际情况设置
});
        

        
        // EC2終了保護#2
        new EC2TerminationProtectionConstruct(this, 'EC2TerminationProtection', {
            ec2Instance: instance,
            namingStackProps: props.namingStackProps
        });

        cdk.Tags.of(instance).add('Name', instanceName);
        
        // EC2 Instance
        const instanceName2 = ResourceNameBuilder.makeResourceNameStr({
            serviceName: 'ec2',
            use: 'other',
            ...props.namingStackProps
        });
        const instance2 = new ec2.Instance(this, 'ec2-other',
            {
                vpc: props.vpc,
                vpcSubnets: { subnets: props.privateSubnets },
                instanceType: new ec2.InstanceType(props.instanceType || 't3.micro'),
                machineImage: ec2.MachineImage.latestAmazonLinux({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
                instanceName: instanceName2,
                role: role,
                securityGroup: sg,
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
        instance.userData.addCommands(
            `hostnamectl set-hostname ${instanceName}`,
            'echo "preserve_hostname: true" >> /etc/cloud/cloud.cfg',
            'timedatectl set-timezone Asia/Tokyo',
            'yum update -y'
        );
        

        // EC2終了保護
        new EC2TerminationProtectionConstruct(this, 'EC2TerminationProtection2', {
            ec2Instance: instance2,
            namingStackProps: props.namingStackProps
        });

        props.alb.addAlbTarget({
        port: 80, // 根据实际情况设置端口
        targets: [new targets.InstanceTarget(instance)],// 如果有的话
        healthCheckPath: '/', // 根据实际情况设置
});

        cdk.Tags.of(instance2).add('Name', instanceName2);
    }
}