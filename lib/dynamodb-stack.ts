import { AttributeType, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface IDynamoDbStackProps extends TableProps {
    id: string;
}

export class DynamoDbStack extends Construct {
    public readonly dynamoTable: Table;
    constructor(scope: Construct, id: string, props: IDynamoDbStackProps) {
        super(scope, id);

        const dynamoTable = new Table(this, props.id, {
            ...props,
            /**
             *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
             * the new table, and it will remain in your account until manually deleted. By setting the policy to
             * DESTROY, cdk destroy will delete the table (even if it has data in it)
             */
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        this.dynamoTable = dynamoTable;
    }
}
