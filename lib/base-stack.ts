import { Stack, CfnElement } from 'aws-cdk-lib'

/** 
 * A base stack class that implements custom logical name 
 * allocation. Adds prefix if it is defined  in the "prefix"
 * 
 * Use `cdk --context prefix=PREFIX` --context stage=dev --context branch=develop to set the prefix
 */

export class BaseStack extends Stack {
    public allocateLogicalId(element: CfnElement) {
        const orig = super.allocateLogicalId(element);
        const prefix = this.node.tryGetContext('prefix');
        const stage = this.node.tryGetContext('stage') || 'dev';
        const branch = this.node.tryGetContext('branch') || 'develop';

        let logicalId = orig + stage + branch;
        logicalId = prefix ? prefix + orig : orig;

        return logicalId;
    }

    public getStage() {
        return this.node.tryGetContext('stage') || 'dev';
    }
}