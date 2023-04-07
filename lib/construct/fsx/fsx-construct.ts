import * as cdk from 'aws-cdk-lib';
import * as fsx from 'aws-cdk-lib/aws-fsx';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as directoryservice from 'aws-cdk-lib/aws-directoryservice';
import { Construct } from 'constructs';

type FSxForWindowsConstructProps = {
    vpc: ec2.IVpc;
    privateSubnets: ec2.ISubnet[];
    managedMicrosoftAD: directoryservice.CfnMicrosoftAD;
    securityGroupId: string;
    storageCapacityGiB?: number;
    throughputCapacityMibps?: number;
};

export class FSxForWindowsConstruct extends Construct {
    public readonly fsxForWindows: fsx.CfnFileSystem;

    constructor(scope: Construct, id: string, props: FSxForWindowsConstructProps) {
        super(scope, id);

        const storageCapacityGiB = props.storageCapacityGiB || 300;
        const throughputCapacityMibps = props.throughputCapacityMibps || 8;

        this.fsxForWindows = new fsx.CfnFileSystem(this, 'FSxForWindows', {
            fileSystemType: 'WINDOWS',
            storageCapacity: storageCapacityGiB,
            throughputCapacity: throughputCapacityMibps,
            windowsConfiguration: {
                activeDirectoryId: props.managedMicrosoftAD.ref,
                throughputCapacity: throughputCapacityMibps,
                weeklyMaintenanceStartTime: '2:00:00', // 根据需要调整维护窗口时间
            },
            subnetIds: props.privateSubnets.map(subnet => subnet.subnetId),
            securityGroupIds: [props.securityGroupId],
            kmsKeyId: 'alias/aws/fsx',
        });
    }
}
