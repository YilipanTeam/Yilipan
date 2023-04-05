import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';

/**
 * AlbConstruct プロパティ
 */
type NlbConstructProps = {
    /**
     * VPC
     */
    vpc: ec2.Vpc;
    /**
     * パブリックサブネット
     */    
    publicSubnets: ec2.ISubnet[];
    /**
     * NLB名
     */
    nlbName?: string;
    /** cdk Destroy した時に自動で削除するか(開発用) 。デフォルト:false */
    cdkAutoRemove?: boolean;
};

type AddNlbTargetProps = {
    /**
     * ターゲットポート
     */    
    port: number;
    /**
     * ヘルスチェックパス
     */
    targets: elb.INetworkLoadBalancerTarget[];
    /**
     * ターゲットグループ名
     * @remark ターゲットグループ名を固定すると更新に失敗することがあるため、非推奨
     */    
    targetGroupName?: string;

};

/**
 * パブリックNLBを作成
 */
export class NlbConstruct extends Construct {
    public readonly instanceProps: NlbConstructProps;
    public readonly nlb: elb.NetworkLoadBalancer;
    public readonly nlbListener: elb.NetworkListener;
    private addTargetCount = 0;

    constructor(scope: Construct, id: string, props: NlbConstructProps) {
        super(scope, id);
        this.instanceProps = props;

        // NLB
        this.nlb = new elb.NetworkLoadBalancer(this, 'Nlb', {
            vpc: props.vpc,
            vpcSubnets: { subnets: props.publicSubnets },
            internetFacing: true,
            loadBalancerName: props.nlbName,
            crossZoneEnabled: true,
            deletionProtection: !props.cdkAutoRemove,
        });

        if (props.nlbName) {
            cdk.Tags.of(this.nlb).add('Name', props.nlbName);
        }
        
        
    }
    /**
     * リスナーにアクセスをターゲットグループへ送信するリスナールールを追加
     * @param id 
     * @param props 
     */
    public addNlbTarget(props: AddNlbTargetProps) {
        this.addTargetCount++;

        // TargetGtoup
        const targetGroup = new elb.NetworkTargetGroup(this, `TargetGroup${this.addTargetCount}`, {
            protocol: elb.Protocol.TCP,
            port: props.port,
            targets: props.targets,
            targetGroupName: props.targetGroupName,
            deregistrationDelay: cdk.Duration.seconds(30),
            healthCheck: {
                interval: cdk.Duration.seconds(30),
                unhealthyThresholdCount: 5,
            },        
            vpc: this.instanceProps.vpc,
        });

        if (props.targetGroupName) {
            cdk.Tags.of(targetGroup).add('Name', props.targetGroupName);
        }
    }
}