namespace claimsure;

using {
    cuid,
    managed
} from '@sap/cds/common';


entity FraudRiskScores : cuid, managed {

    // Many Risk Scores -> One Claim
    claim : Association to Claims @mandatory;

    riskScore : Decimal(5,2) @mandatory;

    riskLevel : String(20) enum {
        Low;
        Medium;
        High;
        Critical;
    };

    evaluationStatus : String(20) enum {
        Pending;
        Completed;
    } default 'Pending';

    evaluationMethod : String(30) enum {
        RuleBased;
        ExternalAPI;
    };

    requiresInvestigation : Boolean default false;

    evaluatedAt : Timestamp default $now;

    remarks : String(1000);
}


entity Investigations : cuid, managed {

    investigationNumber : String(50) @mandatory;


    // Many Investigations -> One Claim
    claim : Association to Claims @mandatory;


    // Many Investigations -> One Employee
    investigator : Association to Employees @mandatory;


    status : String(30) enum {
        Assigned;
        InProgress;
        OnHold;
        Completed;
        Closed;
    } default 'Assigned';


    priority : String(20) enum {
        Low;
        Medium;
        High;
        Critical;
    };


    assignedAt : Timestamp default $now;

    startedAt : Timestamp;

    completedAt : Timestamp;

    findings : LargeString;

    recommendation : String(30) enum {
        Approve;
        Reject;
        FurtherReview;
    };
}


entity Approvals : cuid, managed {

    approvalNumber : String(50);


    // Many Approvals -> One Claim
    claim : Association to Claims @mandatory;


    // Many Approvals -> One Employee
    approver : Association to Employees;


    approvalLevel : String(30) enum {
        ClaimsAgent;
        ClaimsManager;
        FinanceOfficer;
    };


    decision : String(20) enum {
        Pending;
        Approved;
        Rejected;
        Escalated;
    } default 'Pending';


    requestedAt : Timestamp default $now;

    decidedAt : Timestamp;

    comments : LargeString;


    // Used for SAP Build Process Automation
    workflowInstanceId : String(100);
}