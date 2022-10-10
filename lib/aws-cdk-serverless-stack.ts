import { Stack, StackProps } from 'aws-cdk-lib';
import { AuthorizationType, CfnAuthorizer, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import { addCorsOptions } from './apigateway-stack';
import { CognitoStack } from './cognito-stack';
import { DynamoDbStack, IDynamoDbStackProps } from './dynamodb-stack';

export class AwsCdkServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Cognito
    const cognitoStack = new CognitoStack(this, 'cognitoUserPool', {});

    const migrationTriggerLambda = new NodejsFunction(this, 'migrationTriggerLambda', {
      entry: join(__dirname, 'lambdas', 'user-migration.ts'),
      runtime: Runtime.NODEJS_14_X
    });

    cognitoStack.cognitoUserPool.addTrigger(UserPoolOperation.USER_MIGRATION, migrationTriggerLambda);

    // DynamoDB
    const dynamodbProps: IDynamoDbStackProps = {
      id: 'cdk-serverless-dynamodb',
      tableName: 'cdk-serverless',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      }
    }
    const dynamodbStack = new DynamoDbStack(this, 'dynamodb-stack', dynamodbProps);

    // Lambdas
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamodbStack.dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_14_X,
    }

    // Create a login lambda function for the new cognito 
    const loginLambdaFunction = new NodejsFunction(this, 'loginLambdaFunction', {
      ...nodeJsFunctionProps,
      entry: join(__dirname, 'lambdas', 'login.ts')
    })

    // Create a Lambda function for each of the CRUD operations
    const getOneLambda = new NodejsFunction(this, 'getOneItemFunction', {
      entry: join(__dirname, 'lambdas', 'get-one.ts'),
      ...nodeJsFunctionProps,
    });
    const getAllLambda = new NodejsFunction(this, 'getAllItemsFunction', {
      entry: join(__dirname, 'lambdas', 'get-all.ts'),
      ...nodeJsFunctionProps,
    });
    const createOneLambda = new NodejsFunction(this, 'createItemFunction', {
      entry: join(__dirname, 'lambdas', 'create.ts'),
      ...nodeJsFunctionProps,
    });
    const updateOneLambda = new NodejsFunction(this, 'updateItemFunction', {
      entry: join(__dirname, 'lambdas', 'update-one.ts'),
      ...nodeJsFunctionProps,
    });
    const deleteOneLambda = new NodejsFunction(this, 'deleteItemFunction', {
      entry: join(__dirname, 'lambdas', 'delete-one.ts'),
      ...nodeJsFunctionProps,
    });

    // Grant the Lambda function read access to the DynamoDB table
    dynamodbStack.dynamoTable.grantReadWriteData(getAllLambda);
    dynamodbStack.dynamoTable.grantReadWriteData(getOneLambda);
    dynamodbStack.dynamoTable.grantReadWriteData(createOneLambda);
    dynamodbStack.dynamoTable.grantReadWriteData(updateOneLambda);
    dynamodbStack.dynamoTable.grantReadWriteData(deleteOneLambda);

    // Integrate the Lambda functions with the API Gateway resource
    const getAllIntegration = new LambdaIntegration(getAllLambda);
    const createOneIntegration = new LambdaIntegration(createOneLambda);
    const getOneIntegration = new LambdaIntegration(getOneLambda);
    const updateOneIntegration = new LambdaIntegration(updateOneLambda);
    const deleteOneIntegration = new LambdaIntegration(deleteOneLambda);

    const loginIntegration = new LambdaIntegration(loginLambdaFunction);

    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'cdk-serverless-api', {
      restApiName: 'CDK Serverless API'
    });

    const login = api.root.addResource('login');
    login.addMethod('POST', loginIntegration);

    // Authorizer for the Hello World API that uses the
    // Cognito User pool to Authorize users.
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: api.restApiId,
      name: 'ApiLambdaCrudDynamoDBStackAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      // Find a way for this to be passed in as a parameter 
      providerArns: ['arn:aws:cognito-idp:ap-southeast-2:897209608400:userpool/ap-southeast-2_rSv54iLJ1']
    })

    const items = api.root.addResource('items');
    items.addMethod('GET', getAllIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
    items.addMethod('POST', createOneIntegration);
    addCorsOptions(items);

    const singleItem = items.addResource('{id}');
    singleItem.addMethod('GET', getOneIntegration);
    singleItem.addMethod('PATCH', updateOneIntegration);
    singleItem.addMethod('DELETE', deleteOneIntegration);
    addCorsOptions(singleItem);
  }
}
