import * as cdk from 'aws-cdk-lib';
import * as directoryservice from 'aws-cdk-lib/aws-directoryservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../../utils/commonTypes';

type ManagedMicrosoftADConstructProps = {
    namingStackProps: NamingStackProps;
    vpc: ec2.IVpc;
    privateSubnets: ec2.ISubnet[];
    password: cdk.SecretValue;
    domainName?: string;
};

export class ManagedMicrosoftADConstruct extends Construct {
    public readonly managedMicrosoftAD: directoryservice.CfnMicrosoftAD;

    constructor(scope: Construct, id: string, props: ManagedMicrosoftADConstructProps) {
        super(scope, id);

        const domainName = props.domainName || 'yilipan.local';

        this.managedMicrosoftAD = new directoryservice.CfnMicrosoftAD(this, 'ManagedMicrosoftAD', {
            name: domainName,
            password: props.password.toString(),
            vpcSettings: {
                vpcId: props.vpc.vpcId,
                subnetIds: props.privateSubnets.map(subnet => subnet.subnetId),
            },
            edition: 'Standard',
        });
    }
}
