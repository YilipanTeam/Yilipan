import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { NamingStackProps } from '../../../utils/commonTypes';

export interface EC2ConstructProps {
  ec2Instance: ec2.Instance;
  namingStackProps: NamingStackProps;
}

export class EC2Construct extends Construct {
  constructor(scope: Construct, id: string, props: EC2ConstructProps) {
    super(scope, id);

    if (!(/^ctc[0-9]$/.test(props.namingStackProps.envKey))) {
      const cfnInstance = props.ec2Instance.node.defaultChild as ec2.CfnInstance;
      cfnInstance.disableApiTermination = true;
    }
  }
}


