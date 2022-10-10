import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path'

import { Construct } from 'constructs';

export class Layers extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        new LayerVersion(this, 'cognitoUserMigrationLayer', {
            code: Code.fromAsset(join(__dirname, 'node_modules')),
            description: 'cognito-user-migration'
        })

    }

}
