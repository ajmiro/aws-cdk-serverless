import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path'

import { Construct } from 'constructs';
import { StringAttribute, UserPool, UserPoolClientOptions, UserPoolDomainOptions, UserPoolOperation, UserPoolProps } from 'aws-cdk-lib/aws-cognito';

export interface ICognitoStackProps {
    userPoolProps: UserPoolProps;
    domainProps?: UserPoolDomainOptions;
    userPoolClientProps?: UserPoolClientOptions;
}
export class CognitoStack extends Construct {
    public readonly cognitoUserPool: UserPool;

    constructor(scope: Construct, id: string, props: ICognitoStackProps) {
        super(scope, id);

        // Cognito User Pool with Email Sign-in Type.
        const userPool = new UserPool(this, 'userPool', {
            signInAliases: {
                email: true
            },
            customAttributes: {
                partyCode: new StringAttribute({ mutable: false }),
                legacyAccountId: new StringAttribute({ mutable: false }),
                legacyContactId: new StringAttribute({ mutable: false }),
                partycode: new StringAttribute({ mutable: true }),
                legacyaccountId: new StringAttribute({ mutable: true }),
                legacycontactId: new StringAttribute({ mutable: true }),
            }
        });

        this.cognitoUserPool = userPool;

        if (props.domainProps) {
            // To use this https://<cognito-domain>/login?response_type=code&client_id=<your_app_client_id>&redirect_uri=<your_callback_url>
            userPool.addDomain('CognitoDomain', props.domainProps);
        }

        if (props.userPoolClientProps) {
            // set the auth flow to userPasswordAuth and adminUserPassword to pass the password to the lambda 
            // set this back to srpAuth when migration is done
            userPool.addClient('AppClient', props.userPoolClientProps);
        }

    }

}
